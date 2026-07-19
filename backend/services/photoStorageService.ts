/**
 * AUTOVERSE — Photo Storage Service (Supabase Storage)
 *
 * Replaces the local-disk MVP implementation. Uploads go to a
 * `vehicle-photos` bucket via the service-role client (bypasses RLS,
 * safe here because Express already validated the upload — ownership
 * checks happened in listingService before this is ever called).
 *
 * Bucket setup (one-time, via Supabase Dashboard → Storage, or the
 * Supabase CLI):
 *   1. Create a bucket named `vehicle-photos`, set to PUBLIC (listing
 *      photos are meant to be publicly viewable — this is a
 *      marketplace, not a private file store).
 *   2. No bucket-level RLS needed for reads since it's public; if you
 *      later want to restrict uploads via client-side Supabase calls
 *      (currently all uploads go through Express, which already
 *      enforces ownership), add a storage policy scoped to
 *      authenticated + folder-per-vehicle-id.
 */

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const BUCKET = 'vehicle-photos';

export interface StoredPhoto {
  url: string;
  path: string;
}

class PhotoStorageService {
  async saveVehiclePhoto(vehicleId: string, buffer: Buffer, mimeType: string): Promise<StoredPhoto> {
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    const path = `vehicles/${vehicleId}/${randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      throw new Error(`Photo upload failed: ${error.message}`);
    }

    const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
  }

  async deleteVehiclePhoto(path: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
    if (error) {
      console.error('[PhotoStorageService] delete failed:', error.message);
    }
  }
}

export const photoStorageService = new PhotoStorageService();
