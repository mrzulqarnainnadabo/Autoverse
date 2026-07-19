/**
 * AUTOVERSE — Search Service
 *
 * Builds a parameterized query against `public_listings` (see
 * db/buyer_schema.sql). All filter values are bound as query
 * parameters — never string-interpolated — so this is safe against
 * SQL injection regardless of what a user types into the search bar.
 */

import { pool } from '../db/pool';
import { SearchFilters, SearchResponse, SearchResultItem, SortOption } from '../types/search.types';

// AutoInspect grade bands mapped to buyer-facing "condition" language —
// buyers think in terms of "excellent / good / fair" more readily than
// letter grades borrowed from a report card.
const CONDITION_GRADE_MAP: Record<string, string[]> = {
  excellent: ['A'],
  good: ['A', 'B'],
  fair: ['A', 'B', 'C'],
};

const SORT_CLAUSES: Record<SortOption, string> = {
  newest: 'published_at DESC',
  price_asc: 'price_ngn ASC NULLS LAST',
  price_desc: 'price_ngn DESC NULLS LAST',
  ai_score: 'autoinspect_score DESC NULLS LAST',
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export class SearchService {
  async search(filters: SearchFilters): Promise<SearchResponse> {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(filters.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: any[] = [];

    if (filters.q) {
      params.push(`%${filters.q}%`);
      where.push(`(make ILIKE $${params.length} OR model ILIKE $${params.length})`);
    }
    if (filters.make) {
      params.push(filters.make);
      where.push(`make ILIKE $${params.length}`);
    }
    if (filters.yearMin !== undefined) {
      params.push(filters.yearMin);
      where.push(`year >= $${params.length}`);
    }
    if (filters.yearMax !== undefined) {
      params.push(filters.yearMax);
      where.push(`year <= $${params.length}`);
    }
    if (filters.priceMin !== undefined) {
      params.push(filters.priceMin);
      where.push(`price_ngn >= $${params.length}`);
    }
    if (filters.priceMax !== undefined) {
      params.push(filters.priceMax);
      where.push(`price_ngn <= $${params.length}`);
    }
    if (filters.state) {
      params.push(filters.state);
      where.push(`state = $${params.length}`);
    }
    if (filters.transmission) {
      params.push(filters.transmission);
      where.push(`transmission = $${params.length}`);
    }
    if (filters.fuelType) {
      params.push(filters.fuelType);
      where.push(`fuel_type = $${params.length}`);
    }
    if (filters.condition && filters.condition !== 'any' && CONDITION_GRADE_MAP[filters.condition]) {
      params.push(CONDITION_GRADE_MAP[filters.condition]);
      where.push(`autoinspect_grade = ANY($${params.length})`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sortClause = SORT_CLAUSES[filters.sort ?? 'newest'];

    const countQuery = `SELECT COUNT(*)::int AS count FROM public_listings ${whereClause}`;
    const { rows: countRows } = await pool.query(countQuery, params);
    const totalCount = countRows[0].count;

    const dataParams = [...params, limit, offset];
    const dataQuery = `
      SELECT * FROM public_listings
      ${whereClause}
      ORDER BY ${sortClause}
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;
    const { rows } = await pool.query(dataQuery, dataParams);

    return {
      results: rows.map(this.mapRow),
      totalCount,
      page,
      limit,
    };
  }

  private mapRow(row: any): SearchResultItem {
    return {
      vehicleId: row.vehicle_id,
      make: row.make,
      model: row.model,
      year: row.year,
      mileageKm: Number(row.mileage_km),
      priceNGN: Number(row.price_ngn),
      state: row.state,
      lga: row.lga,
      primaryImageUrl: row.primary_image_url,
      autoInspectScore: row.autoinspect_score !== null ? Number(row.autoinspect_score) : null,
      autoInspectGrade: row.autoinspect_grade,
      dealerBusinessName: row.dealer_business_name,
      dealerVerified: row.dealer_verification_status === 'verified',
      publishedAt: row.published_at,
    };
  }
}

export const searchService = new SearchService();
