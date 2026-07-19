-- AUTOVERSE — Sell / Listing Creation schema additions
-- Run after core_schema.sql and autoinspect schema.sql.

-- Drafts are created before all vehicle details are known (photos come
-- first in the Sell flow), so these columns must be nullable at the DB
-- level. Completeness is enforced in application code at publish time
-- (see listingService.publish), not via NOT NULL constraints — this
-- keeps the draft-save UX flexible without weakening data integrity
-- for *published* listings, which the publish() validation guards.
ALTER TABLE vehicles
  ALTER COLUMN make DROP NOT NULL,
  ALTER COLUMN model DROP NOT NULL,
  ALTER COLUMN year DROP NOT NULL,
  ALTER COLUMN mileage_km DROP NOT NULL,
  ALTER COLUMN price_ngn DROP NOT NULL;

ALTER TABLE vehicles
  ADD COLUMN IF NOT EXISTS description   TEXT,
  ADD COLUMN IF NOT EXISTS transmission  TEXT CHECK (transmission IN ('automatic','manual')),
  ADD COLUMN IF NOT EXISTS fuel_type     TEXT CHECK (fuel_type IN ('petrol','diesel','hybrid','electric')),
  ADD COLUMN IF NOT EXISTS state         TEXT,
  ADD COLUMN IF NOT EXISTS lga           TEXT,
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS vehicle_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id  UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  angle       TEXT,                -- e.g. 'front_34' — mirrors AutoInspect angle taxonomy
  position    SMALLINT NOT NULL DEFAULT 0,
  is_cover    BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_photos_vehicle_id
  ON vehicle_photos (vehicle_id, position);

-- Ensure exactly one cover photo per vehicle at the application layer;
-- this partial unique index catches any bug that tries to set two.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicle_photos_one_cover
  ON vehicle_photos (vehicle_id) WHERE is_cover = true;
