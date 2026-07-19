-- AUTOVERSE — Buyer-side search & discovery schema additions
-- Run after core_schema.sql, autoinspect schema.sql, and listing_schema.sql.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Dealer rating is denormalized for cheap reads on the search grid and
-- detail page. In production, update via a trigger or application-level
-- write-through whenever a review is created — a full reviews table is
-- a natural next slice once the messaging/transaction flow exists to
-- gate reviews to verified buyers.
ALTER TABLE dealers
  ADD COLUMN IF NOT EXISTS rating_avg    NUMERIC(2,1) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count  INTEGER NOT NULL DEFAULT 0;

-- Fuzzy/partial matching for make & model — Nigerian buyers frequently
-- search misspelled or partial terms ("camri", "corola") on mobile
-- keyboards; trigram indexes make ILIKE '%term%' searches fast instead
-- of falling back to a full table scan.
CREATE INDEX IF NOT EXISTS idx_vehicles_make_trgm
  ON vehicles USING GIN (make gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_model_trgm
  ON vehicles USING GIN (model gin_trgm_ops);

-- Composite indexes for the most common search sort/filter combinations.
CREATE INDEX IF NOT EXISTS idx_vehicles_active_price
  ON vehicles (status, price_ngn) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_vehicles_active_published
  ON vehicles (status, published_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_vehicles_active_state
  ON vehicles (status, state) WHERE status = 'active';

-- ============================================================
-- public_listings: the single source of truth for both the search
-- grid and the car detail page. Keeping the join logic in one view
-- means search results and the detail page can never drift out of
-- sync on things like "which AutoInspect report is current."
-- ============================================================
CREATE OR REPLACE VIEW public_listings AS
SELECT
  v.id                        AS vehicle_id,
  v.make, v.model, v.year, v.mileage_km, v.price_ngn,
  v.transmission, v.fuel_type, v.state, v.lga, v.description,
  v.primary_image_url, v.published_at, v.created_at,
  v.dealer_id, v.seller_id,
  d.business_name              AS dealer_business_name,
  d.verification_status         AS dealer_verification_status,
  d.rating_avg,
  d.rating_count,
  latest_report.report_id       AS autoinspect_report_id,
  latest_report.overall_score    AS autoinspect_score,
  latest_report.grade             AS autoinspect_grade
FROM vehicles v
LEFT JOIN dealers d ON d.id = v.dealer_id
LEFT JOIN LATERAL (
  SELECT report_id, overall_score, grade
  FROM autoinspect_reports ar
  WHERE ar.vehicle_id = v.id
  ORDER BY ar.created_at DESC
  LIMIT 1
) latest_report ON true
WHERE v.status = 'active';
