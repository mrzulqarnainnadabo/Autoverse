-- AUTOVERSE — AV Drive
-- Structured private hire for verified car owners (not open street taxi).
-- Pilot cities: Abuja, Kaduna. Intercity: Abuja ↔ Kaduna.
-- GPS: Phase A stores pickup/dropoff coordinates; Phase B optional live pings.
-- Run AFTER core_schema.sql, listing_schema.sql, verification_schema.sql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Owner opt-in profile
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS av_drive_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  home_city           TEXT NOT NULL
                        CHECK (home_city IN ('Abuja', 'Kaduna')),
  job_types           TEXT[] NOT NULL DEFAULT '{}',
                        -- allowed values enforced in app: airport_transfer, intercity
  is_available        BOOLEAN NOT NULL DEFAULT false,
  available_from      TIME,                      -- local time window start (optional)
  available_to        TIME,
  work_ready          BOOLEAN NOT NULL DEFAULT false,  -- KYC + vehicle (+ preferred inspect)
  kyc_status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (kyc_status IN ('pending', 'verified', 'rejected')),
  bio                 TEXT,
  rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count        INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_drive_profiles_city_available
  ON av_drive_profiles (home_city, is_available)
  WHERE is_available = true AND work_ready = true;

-- ---------------------------------------------------------------------------
-- Jobs (bookings)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS av_drive_jobs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES users(id),
  owner_id            UUID REFERENCES users(id),       -- set on accept
  profile_id          UUID REFERENCES av_drive_profiles(id),
  vehicle_id          UUID REFERENCES vehicles(id),

  job_type            TEXT NOT NULL
                        CHECK (job_type IN ('airport_transfer', 'intercity')),
  corridor            TEXT,                            -- e.g. 'Abuja-Kaduna', 'Abuja-local'
  city                TEXT
                        CHECK (city IS NULL OR city IN ('Abuja', 'Kaduna')),

  pickup_label        TEXT NOT NULL,
  dropoff_label       TEXT NOT NULL,
  pickup_lat          DOUBLE PRECISION,
  pickup_lng          DOUBLE PRECISION,
  dropoff_lat         DOUBLE PRECISION,
  dropoff_lng         DOUBLE PRECISION,

  scheduled_at        TIMESTAMPTZ NOT NULL,
  notes               TEXT,

  status              TEXT NOT NULL DEFAULT 'requested'
                        CHECK (status IN (
                          'requested',
                          'accepted',
                          'in_progress',
                          'completed',
                          'cancelled',
                          'disputed'
                        )),

  price_ngn           BIGINT,                          -- agreed or quoted amount
  currency            TEXT NOT NULL DEFAULT 'NGN',
  payment_status      TEXT NOT NULL DEFAULT 'unpaid'
                        CHECK (payment_status IN ('unpaid', 'logged', 'paid', 'refunded')),

  accepted_at         TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  cancel_reason       TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_drive_jobs_client ON av_drive_jobs (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_av_drive_jobs_owner ON av_drive_jobs (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_av_drive_jobs_status ON av_drive_jobs (status);
CREATE INDEX IF NOT EXISTS idx_av_drive_jobs_scheduled ON av_drive_jobs (scheduled_at);

-- ---------------------------------------------------------------------------
-- Audit / status events (+ optional location pings as event_type = location_ping)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS av_drive_job_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES av_drive_jobs(id) ON DELETE CASCADE,
  actor_id      UUID REFERENCES users(id),
  event_type    TEXT NOT NULL
                  CHECK (event_type IN (
                    'created',
                    'accepted',
                    'started',
                    'completed',
                    'cancelled',
                    'disputed',
                    'location_ping',
                    'note'
                  )),
  lat           DOUBLE PRECISION,
  lng           DOUBLE PRECISION,
  meta          JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_drive_job_events_job
  ON av_drive_job_events (job_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Post-job ratings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS av_drive_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL UNIQUE REFERENCES av_drive_jobs(id) ON DELETE CASCADE,
  from_user_id  UUID NOT NULL REFERENCES users(id),
  to_user_id    UUID NOT NULL REFERENCES users(id),
  stars         SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_drive_ratings_to_user
  ON av_drive_ratings (to_user_id);

-- ---------------------------------------------------------------------------
-- Optional Phase B: denser location trail (purge on a schedule for NDPR)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS av_drive_location_pings (
  id            BIGSERIAL PRIMARY KEY,
  job_id        UUID NOT NULL REFERENCES av_drive_jobs(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES users(id),
  lat           DOUBLE PRECISION NOT NULL,
  lng           DOUBLE PRECISION NOT NULL,
  accuracy_m    REAL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_av_drive_location_pings_job_time
  ON av_drive_location_pings (job_id, recorded_at DESC);

COMMENT ON TABLE av_drive_profiles IS 'AV Drive owner profiles — pilot Abuja & Kaduna';
COMMENT ON TABLE av_drive_jobs IS 'Structured private hire jobs with Phase A geo (pickup/dropoff)';
COMMENT ON TABLE av_drive_location_pings IS 'Phase B live trail while job in_progress; retain briefly (NDPR)';
