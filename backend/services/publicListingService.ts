/**
 * AUTOVERSE — Public Listing Detail Service
 * Powers CarDetailScreen: full photo set, full AutoInspect report
 * (not just score/grade), dealer contact info, and the "message
 * dealer" entry point that seeds the existing inquiries pipeline
 * already surfaced on the Dealer Dashboard.
 */

import { randomUUID } from 'crypto';
import { pool } from '../db/pool';
import { HttpError } from '../utils/httpError';
import { PublicListingDetail, CreateInquiryInput } from '../types/search.types';
import { messagingService } from './messagingService';

export class PublicListingService {
  async getDetail(vehicleId: string): Promise<PublicListingDetail> {
    const { rows } = await pool.query(`SELECT * FROM public_listings WHERE vehicle_id = $1`, [vehicleId]);
    if (rows.length === 0) {
      throw new HttpError(404, 'This listing is no longer available.');
    }
    const v = rows[0];

    const { rows: photoRows } = await pool.query(
      `SELECT url, angle, position FROM vehicle_photos WHERE vehicle_id = $1 ORDER BY position ASC`,
      [vehicleId]
    );

    let dealerPhone: string | null = null;
    if (v.dealer_id) {
      const { rows: dealerUserRows } = await pool.query(`SELECT phone FROM users WHERE id = $1`, [v.dealer_id]);
      dealerPhone = dealerUserRows[0]?.phone ?? null;
    } else if (v.seller_id) {
      const { rows: sellerRows } = await pool.query(`SELECT phone FROM users WHERE id = $1`, [v.seller_id]);
      dealerPhone = sellerRows[0]?.phone ?? null;
    }

    let autoInspect: PublicListingDetail['autoInspect'] = null;
    if (v.autoinspect_report_id) {
      const { rows: reportRows } = await pool.query(
        `SELECT report_id, overall_score, grade, confidence, category_scores, flags,
                repair_estimates, disclaimer
         FROM autoinspect_reports WHERE report_id = $1`,
        [v.autoinspect_report_id]
      );
      if (reportRows.length > 0) {
        const r = reportRows[0];
        autoInspect = {
          reportId: r.report_id,
          overallScore: r.overall_score,
          grade: r.grade,
          confidence: r.confidence,
          categoryScores: r.category_scores,
          flags: r.flags,
          repairEstimates: r.repair_estimates,
          disclaimer: r.disclaimer,
        };
      }
    }

    return {
      vehicleId: v.vehicle_id,
      make: v.make,
      model: v.model,
      year: v.year,
      mileageKm: Number(v.mileage_km),
      priceNGN: Number(v.price_ngn),
      description: v.description,
      transmission: v.transmission,
      fuelType: v.fuel_type,
      state: v.state,
      lga: v.lga,
      publishedAt: v.published_at,
      photos: photoRows.map((p) => ({ url: p.url, angle: p.angle, position: p.position })),
      dealer: {
        id: v.dealer_id,
        businessName: v.dealer_business_name || 'Individual Seller',
        verified: v.dealer_verification_status === 'verified',
        ratingAvg: v.rating_avg !== null ? Number(v.rating_avg) : 0,
        ratingCount: v.rating_count !== null ? Number(v.rating_count) : 0,
        phone: dealerPhone,
      },
      autoInspect,
    };
  }

  /**
   * Buyer taps "Message Dealer" on a listing — creates an inquiry
   * against the SAME `inquiries` table already surfaced on the Dealer
   * Dashboard (see dealerDashboardService.getRecentInquiries) AND
   * creates/reuses a live conversation thread via messagingService,
   * with this message as the conversation's first entry — so a buyer's
   * first contact shows up in both the dealer's inbox stat AND as an
   * openable chat thread, from a single action.
   */
  async createInquiry(
    vehicleId: string,
    buyerId: string,
    input: CreateInquiryInput
  ): Promise<{ inquiryId: string; conversationId: string }> {
    const { rows } = await pool.query(
      `SELECT dealer_id FROM vehicles WHERE id = $1 AND status = 'active'`,
      [vehicleId]
    );
    if (rows.length === 0) {
      throw new HttpError(404, 'This listing is no longer available.');
    }

    const inquiryId = randomUUID();
    await pool.query(
      `INSERT INTO inquiries (id, vehicle_id, dealer_id, buyer_id, buyer_name, buyer_phone, message, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'new')`,
      [inquiryId, vehicleId, rows[0].dealer_id, buyerId, input.buyerName, input.buyerPhone, input.message]
    );

    const conversation = await messagingService.getOrCreateConversation(vehicleId, buyerId, inquiryId);
    await messagingService.sendMessage(conversation.id, buyerId, input.message);

    return { inquiryId, conversationId: conversation.id };
  }
}

export const publicListingService = new PublicListingService();
