/**
 * AUTOVERSE — Dealer Dashboard Service
 * Reads from the `dealer_dashboard_summary` and `vehicle_listing_stats`
 * SQL views defined in db/core_schema.sql. Keeping aggregation logic in
 * SQL views (rather than application code) means the dashboard, any
 * future analytics export, and admin tooling all stay consistent.
 */

import { pool } from '../db/pool';
import {
  DealerDashboardSummary,
  DealerListingItem,
  DealerInquiryItem,
  DealerDashboardResponse,
} from '../types/dealer.types';

export class DealerDashboardService {
  async getSummary(dealerId: string): Promise<DealerDashboardSummary | null> {
    const { rows } = await pool.query(
      `SELECT * FROM dealer_dashboard_summary WHERE dealer_id = $1`,
      [dealerId]
    );
    if (rows.length === 0) return null;
    return this.mapSummaryRow(rows[0]);
  }

  async getListings(
    dealerId: string,
    opts: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<DealerListingItem[]> {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;

    const params: any[] = [dealerId];
    let statusClause = '';
    if (opts.status) {
      params.push(opts.status);
      statusClause = `AND status = $${params.length}`;
    }
    params.push(limit, offset);

    const { rows } = await pool.query(
      `SELECT * FROM vehicle_listing_stats
       WHERE dealer_id = $1 ${statusClause}
       ORDER BY updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return rows.map(this.mapListingRow);
  }

  async getRecentInquiries(dealerId: string, limit = 20): Promise<DealerInquiryItem[]> {
    const { rows } = await pool.query(
      `SELECT iq.id, iq.vehicle_id, iq.buyer_name, iq.buyer_phone,
              iq.message, iq.status, iq.created_at,
              v.year, v.make, v.model
       FROM inquiries iq
       JOIN vehicles v ON v.id = iq.vehicle_id
       WHERE iq.dealer_id = $1
       ORDER BY iq.created_at DESC
       LIMIT $2`,
      [dealerId, limit]
    );

    return rows.map((r) => ({
      id: r.id,
      vehicleId: r.vehicle_id,
      vehicleLabel: `${r.year} ${r.make} ${r.model}`,
      buyerName: r.buyer_name,
      buyerPhone: r.buyer_phone,
      message: r.message,
      status: r.status,
      createdAt: r.created_at,
    }));
  }

  async getDashboard(dealerId: string): Promise<DealerDashboardResponse | null> {
    const summary = await this.getSummary(dealerId);
    if (!summary) return null;

    const [listings, recentInquiries] = await Promise.all([
      this.getListings(dealerId, { limit: 20 }),
      this.getRecentInquiries(dealerId, 10),
    ]);

    return { summary, listings, recentInquiries };
  }

  private mapSummaryRow(row: any): DealerDashboardSummary {
    return {
      dealerId: row.dealer_id,
      businessName: row.business_name,
      verificationStatus: row.verification_status,
      subscriptionTier: row.subscription_tier,
      activeListings: Number(row.active_listings),
      soldThisMonth: Number(row.sold_this_month),
      totalViews30d: Number(row.total_views_30d),
      totalInquiries30d: Number(row.total_inquiries_30d),
      newInquiries: Number(row.new_inquiries),
      avgAutoInspectScore: row.avg_autoinspect_score !== null ? Number(row.avg_autoinspect_score) : null,
    };
  }

  private mapListingRow(row: any): DealerListingItem {
    return {
      vehicleId: row.vehicle_id,
      make: row.make,
      model: row.model,
      year: row.year,
      mileageKm: Number(row.mileage_km),
      priceNGN: Number(row.price_ngn),
      status: row.status,
      primaryImageUrl: row.primary_image_url,
      autoInspectScore: row.autoinspect_score !== null ? Number(row.autoinspect_score) : null,
      autoInspectGrade: row.autoinspect_grade,
      views30d: Number(row.views_30d),
      inquiries30d: Number(row.inquiries_30d),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const dealerDashboardService = new DealerDashboardService();
