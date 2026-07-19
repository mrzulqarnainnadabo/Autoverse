-- AUTOVERSE — AutoInspect schema
-- Depends on: vehicles(id), users(id) existing from core marketplace schema.

CREATE TABLE IF NOT EXISTS autoinspect_reports (
  report_id                  UUID PRIMARY KEY,
  vehicle_id                 UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  seller_id                  UUID NOT NULL REFERENCES users(id),
  model_used                 TEXT NOT NULL,
  overall_score               SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  grade                       CHAR(1) NOT NULL CHECK (grade IN ('A','B','C','D','F')),
  confidence                  TEXT NOT NULL CHECK (confidence IN ('low','medium','high')),
  category_scores             JSONB NOT NULL,
  flags                       JSONB NOT NULL,
  repair_estimates            JSONB NOT NULL,
  odometer_reading_km         INTEGER,
  odometer_plausible          BOOLEAN,
  images_analyzed             JSONB NOT NULL,
  images_missing_recommended  JSONB NOT NULL,
  disclaimer                  TEXT NOT NULL,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_autoinspect_vehicle_id ON autoinspect_reports (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_autoinspect_seller_id ON autoinspect_reports (seller_id);
CREATE INDEX IF NOT EXISTS idx_autoinspect_created_at ON autoinspect_reports (created_at DESC);

-- Critical flags (severity = 'critical') should be queryable fast for
-- trust & safety review queues without unpacking the full JSONB blob.
CREATE INDEX IF NOT EXISTS idx_autoinspect_flags_gin ON autoinspect_reports USING GIN (flags);
