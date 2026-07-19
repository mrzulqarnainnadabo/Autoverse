/**
 * AUTOVERSE — Listing Creation Service
 *
 * Implements the draft-then-publish lifecycle behind the Sell flow:
 *   1. createDraft        — instant, near-empty vehicle row (photos come first)
 *   2. attachPhotosAndInspect — persists gallery photos, optionally runs AutoInspect
 *   3. updateDetails       — fills in make/model/price/etc as the seller types
 *   4. publish              — validates completeness, flips status → 'active'
 *
 * Every mutating method verifies the requesting user owns the vehicle
 * (or is an admin) before touching it — a seller must never be able to
 * edit another dealer's draft by guessing a vehicleId.
 */

import { randomUUID } from 'crypto';
import { pool } from '../db/pool';
import { HttpError } from '../utils/httpError';
import { photoStorageService } from './photoStorageService';
import { claudeVisionService } from './claudeVisionService';
import { saveAutoInspectReport } from './autoinspectPersistence';
import {
  ListingDraft,
  UpdateListingDetailsInput,
  VehiclePhotoRecord,
  PublishValidationResult,
} from '../types/listing.types';
import { AutoInspectReport, InspectionAngle } from '../types/autoinspect.types';

interface IncomingPhoto {
  angle: InspectionAngle | null;
  buffer: Buffer;
  mimeType: string;
}

interface AuthContext {
  userId: string;
  role: string;
}

const REQUIRED_PUBLISH_FIELDS: Array<{ column: string; label: string }> = [
  { column: 'make', label: 'Make' },
  { column: 'model', label: 'Model' },
  { column: 'year', label: 'Year' },
  { column: 'mileage_km', label: 'Mileage' },
  { column: 'price_ngn', label: 'Price' },
  { column: 'state', label: 'State' },
];

class ListingService {
  async createDraft(auth: AuthContext): Promise<{ vehicleId: string }> {
    if (!['dealer', 'seller', 'admin'].includes(auth.role)) {
      throw new HttpError(403, 'Only dealers and sellers can create listings.');
    }

    // dealer_id is set only when the creator is a dealer account; individual
    // sellers use seller_id instead (see core_schema.sql).
    const isDealer = auth.role === 'dealer';
    const { rows } = await pool.query(
      `INSERT INTO vehicles (id, dealer_id, seller_id, status)
       VALUES ($1, $2, $3, 'draft')
       RETURNING id`,
      [randomUUID(), isDealer ? auth.userId : null, isDealer ? null : auth.userId]
    );
    return { vehicleId: rows[0].id };
  }

  async attachPhotosAndInspect(
    vehicleId: string,
    auth: AuthContext,
    photos: IncomingPhoto[],
    declared: { year?: number; make?: string; model?: string; mileageKm?: number },
    triggerInspection: boolean
  ): Promise<{ photos: VehiclePhotoRecord[]; report: AutoInspectReport | null }> {
    const vehicle = await this.assertOwnership(vehicleId, auth);

    if (photos.length === 0) {
      throw new HttpError(400, 'At least one photo is required.');
    }

    // 1. Persist photos to storage + vehicle_photos, first photo becomes cover.
    const { rows: existing } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM vehicle_photos WHERE vehicle_id = $1`,
      [vehicleId]
    );
    const startPosition = existing[0].count;

    const stored: VehiclePhotoRecord[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const { url } = await photoStorageService.saveVehiclePhoto(vehicleId, photo.buffer, photo.mimeType);
      const isCover = startPosition === 0 && i === 0;

      const { rows } = await pool.query(
        `INSERT INTO vehicle_photos (vehicle_id, url, angle, position, is_cover)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id, url, angle, position, is_cover`,
        [vehicleId, url, photo.angle, startPosition + i, isCover]
      );
      stored.push({
        id: rows[0].id,
        url: rows[0].url,
        angle: rows[0].angle,
        position: rows[0].position,
        isCover: rows[0].is_cover,
      });

      if (isCover) {
        await pool.query(`UPDATE vehicles SET primary_image_url = $1 WHERE id = $2`, [url, vehicleId]);
      }
    }

    // 2. Optionally run AutoInspect on the same photos (no re-capture needed).
    let report: AutoInspectReport | null = null;
    if (triggerInspection) {
      const base64Photos = photos
        .filter((p) => p.angle !== null)
        .map((p) => ({
          angle: p.angle as InspectionAngle,
          base64: p.buffer.toString('base64'),
          mediaType: (p.mimeType as any) || 'image/jpeg',
        }));

      if (base64Photos.length > 0) {
        report = await claudeVisionService.analyzeVehicle(vehicleId, {
          vehicleId,
          sellerId: auth.userId,
          declaredYear: declared.year,
          declaredMake: declared.make,
          declaredModel: declared.model,
          declaredMileageKm: declared.mileageKm,
          photos: base64Photos,
        });
        await saveAutoInspectReport(report, auth.userId);
      }
    }

    return { photos: stored, report };
  }

  async updateDetails(
    vehicleId: string,
    auth: AuthContext,
    input: UpdateListingDetailsInput
  ): Promise<ListingDraft> {
    await this.assertOwnership(vehicleId, auth);

    const fieldMap: Record<string, any> = {
      make: input.make,
      model: input.model,
      year: input.year,
      mileage_km: input.mileageKm,
      price_ngn: input.priceNGN,
      description: input.description,
      transmission: input.transmission,
      fuel_type: input.fuelType,
      state: input.state,
      lga: input.lga,
    };

    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [column, value] of Object.entries(fieldMap)) {
      if (value !== undefined) {
        values.push(value);
        setClauses.push(`${column} = $${values.length}`);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpError(400, 'No fields provided to update.');
    }

    values.push(vehicleId);
    setClauses.push(`updated_at = now()`);
    await pool.query(
      `UPDATE vehicles SET ${setClauses.join(', ')} WHERE id = $${values.length}`,
      values
    );

    return this.getDraft(vehicleId, auth);
  }

  async validateForPublish(vehicleId: string): Promise<PublishValidationResult> {
    const { rows } = await pool.query(`SELECT * FROM vehicles WHERE id = $1`, [vehicleId]);
    if (rows.length === 0) throw new HttpError(404, 'Listing not found.');
    const vehicle = rows[0];

    const missingFields = REQUIRED_PUBLISH_FIELDS
      .filter((f) => vehicle[f.column] === null || vehicle[f.column] === '')
      .map((f) => f.label);

    const { rows: photoRows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM vehicle_photos WHERE vehicle_id = $1`,
      [vehicleId]
    );
    if (photoRows[0].count === 0) missingFields.push('At least one photo');

    return { canPublish: missingFields.length === 0, missingFields };
  }

  async publish(vehicleId: string, auth: AuthContext): Promise<ListingDraft> {
    await this.assertOwnership(vehicleId, auth);

    const validation = await this.validateForPublish(vehicleId);
    if (!validation.canPublish) {
      throw new HttpError(422, 'Listing is missing required fields.', {
        missingFields: validation.missingFields,
      });
    }

    await pool.query(
      `UPDATE vehicles SET status = 'active', published_at = now(), updated_at = now() WHERE id = $1`,
      [vehicleId]
    );

    return this.getDraft(vehicleId, auth);
  }

  async getDraft(vehicleId: string, auth: AuthContext): Promise<ListingDraft> {
    await this.assertOwnership(vehicleId, auth);

    const { rows } = await pool.query(`SELECT * FROM vehicles WHERE id = $1`, [vehicleId]);
    if (rows.length === 0) throw new HttpError(404, 'Listing not found.');
    const v = rows[0];

    const { rows: photoRows } = await pool.query(
      `SELECT id, url, angle, position, is_cover FROM vehicle_photos
       WHERE vehicle_id = $1 ORDER BY position ASC`,
      [vehicleId]
    );

    return {
      vehicleId: v.id,
      dealerId: v.dealer_id,
      status: v.status,
      make: v.make,
      model: v.model,
      year: v.year,
      mileageKm: v.mileage_km,
      priceNGN: v.price_ngn,
      description: v.description,
      transmission: v.transmission,
      fuelType: v.fuel_type,
      state: v.state,
      lga: v.lga,
      photos: photoRows.map((p) => ({
        id: p.id,
        url: p.url,
        angle: p.angle,
        position: p.position,
        isCover: p.is_cover,
      })),
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    };
  }

  /** Confirms the requesting user owns this vehicle (or is admin). */
  private async assertOwnership(vehicleId: string, auth: AuthContext) {
    const { rows } = await pool.query(
      `SELECT dealer_id, seller_id FROM vehicles WHERE id = $1`,
      [vehicleId]
    );
    if (rows.length === 0) throw new HttpError(404, 'Listing not found.');

    const { dealer_id, seller_id } = rows[0];
    const owns = dealer_id === auth.userId || seller_id === auth.userId;
    if (!owns && auth.role !== 'admin') {
      throw new HttpError(403, 'You do not have access to this listing.');
    }
    return rows[0];
  }
}

export const listingService = new ListingService();
