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

-- Dashboard aggregation views (vehicle_listing_stats, dealer_dashboard_summary)
-- live in dashboard_views.sql, not here — they reference autoinspect_reports,
-- which is created by schema.sql, which runs AFTER this file (autoinspect_reports
-- has FK references to vehicles/users, which this file defines). Keeping the
-- views in a separate, later file avoids the circular ordering that put them
-- here originally.
