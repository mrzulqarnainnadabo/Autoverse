-- AUTOVERSE — Core marketplace tables supporting the Dealer Dashboard
-- These are minimal, production-shaped versions of the core schema.
-- autoinspect_reports (see autoinspect schema.sql) already references
-- vehicles(id) and users(id) — this file defines those, plus the
-- dealer/inquiry/view-tracking tables the dashboard aggregates over.

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          TEXT NOT NULL CHECK (role IN ('buyer','seller','dealer','importer','admin')),
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dealers (
  id                    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  business_name         TEXT NOT NULL,
  cac_number             TEXT,                    -- Corporate Affairs Commission reg. no.
  state                  TEXT NOT NULL,
  lga                    TEXT,                     -- Local Government Area
  verification_status    TEXT NOT NULL DEFAULT 'pending'
                            CHECK (verification_status IN ('pending','verified','rejected')),
  verified_at             TIMESTAMPTZ,
  subscription_tier       TEXT NOT NULL DEFAULT 'free'
                            CHECK (subscription_tier IN ('free','plus','pro')),
  logo_url                TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id       UUID REFERENCES dealers(id) ON DELETE SET NULL,
  seller_id       UUID REFERENCES users(id),           -- individual seller, if not a dealer
  make            TEXT NOT NULL,
  model           TEXT NOT NULL,
  year            SMALLINT NOT NULL,
  mileage_km      INTEGER NOT NULL,
  price_ngn       BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','active','sold','archived')),
  primary_image_url TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sold_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vehicles_dealer_id ON vehicles (dealer_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (status);

CREATE TABLE IF NOT EXISTS listing_views (
  id          BIGSERIAL PRIMARY KEY,
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  viewer_id   UUID REFERENCES users(id),
  source      TEXT,                -- 'search', 'share_link', 'featured', etc.
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_listing_views_vehicle_id_time
  ON listing_views (vehicle_id, viewed_at DESC);

CREATE TABLE IF NOT EXISTS inquiries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  dealer_id     UUID REFERENCES dealers(id) ON DELETE SET NULL,
  buyer_id      UUID REFERENCES users(id),
  buyer_name    TEXT NOT NULL,
  buyer_phone   TEXT NOT NULL,
  message       TEXT,
  status        TEXT NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','contacted','closed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_dealer_id_time
  ON inquiries (dealer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries (status);

-- ============================================================
-- Dashboard aggregation views
-- Materializing these as plain views keeps the dashboard query
-- simple and correct; if dealer volume grows large, convert to
-- a MATERIALIZED VIEW refreshed on a schedule (e.g. every 5 min)
-- rather than optimizing the live query further.
-- ============================================================

-- Per-vehicle stats: latest AutoInspect result + engagement counts.
-- Used to render each listing card in the dashboard.
CREATE OR REPLACE VIEW vehicle_listing_stats AS
SELECT
  v.id                          AS vehicle_id,
  v.dealer_id,
  v.make, v.model, v.year, v.mileage_km, v.price_ngn,
  v.status, v.primary_image_url, v.created_at, v.updated_at,
  latest_report.overall_score   AS autoinspect_score,
  latest_report.grade           AS autoinspect_grade,
  COALESCE(views_30d.count, 0)   AS views_30d,
  COALESCE(inquiries_30d.count, 0) AS inquiries_30d
FROM vehicles v
LEFT JOIN LATERAL (
  SELECT overall_score, grade
  FROM autoinspect_reports ar
  WHERE ar.vehicle_id = v.id
  ORDER BY ar.created_at DESC
  LIMIT 1
) latest_report ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count
  FROM listing_views lv
  WHERE lv.vehicle_id = v.id AND lv.viewed_at >= now() - INTERVAL '30 days'
) views_30d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count
  FROM inquiries iq
  WHERE iq.vehicle_id = v.id AND iq.created_at >= now() - INTERVAL '30 days'
) inquiries_30d ON true;

-- Per-dealer rollup: the top-level stat cards on the dashboard.
CREATE OR REPLACE VIEW dealer_dashboard_summary AS
SELECT
  d.id AS dealer_id,
  d.business_name,
  d.verification_status,
  d.subscription_tier,
  COALESCE(active.count, 0)        AS active_listings,
  COALESCE(sold_month.count, 0)     AS sold_this_month,
  COALESCE(views_30d.count, 0)       AS total_views_30d,
  COALESCE(inquiries_30d.count, 0)    AS total_inquiries_30d,
  COALESCE(new_inquiries.count, 0)     AS new_inquiries,
  ROUND(avg_score.avg_score::numeric, 1) AS avg_autoinspect_score
FROM dealers d
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM vehicles v
  WHERE v.dealer_id = d.id AND v.status = 'active'
) active ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM vehicles v
  WHERE v.dealer_id = d.id AND v.status = 'sold'
    AND date_trunc('month', v.sold_at) = date_trunc('month', now())
) sold_month ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM listing_views lv
  JOIN vehicles v ON v.id = lv.vehicle_id
  WHERE v.dealer_id = d.id AND lv.viewed_at >= now() - INTERVAL '30 days'
) views_30d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM inquiries iq
  WHERE iq.dealer_id = d.id AND iq.created_at >= now() - INTERVAL '30 days'
) inquiries_30d ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS count FROM inquiries iq
  WHERE iq.dealer_id = d.id AND iq.status = 'new'
) new_inquiries ON true
LEFT JOIN LATERAL (
  SELECT AVG(ar.overall_score) AS avg_score
  FROM autoinspect_reports ar
  JOIN vehicles v ON v.id = ar.vehicle_id
  WHERE v.dealer_id = d.id
) avg_score ON true;
