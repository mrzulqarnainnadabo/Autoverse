-- AUTOVERSE — Dealer Verification (KYC) schema
-- Run after core_schema.sql and supabase_migration.sql.

-- Common Nigerian identity document types accepted for dealer KYC.
CREATE TYPE id_document_type AS ENUM ('nin', 'drivers_license', 'international_passport', 'voters_card');
CREATE TYPE verification_submission_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS dealer_verification_submissions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id             UUID NOT NULL REFERENCES dealers(id) ON DELETE CASCADE,
  cac_document_path       TEXT NOT NULL,     -- storage path (private bucket) — resolved to a signed URL on read, never stored as a public URL
  id_document_path         TEXT NOT NULL,     -- storage path (private bucket) — same as above
  id_document_type           id_document_type NOT NULL,
  business_address             TEXT NOT NULL,
  status                        verification_submission_status NOT NULL DEFAULT 'pending',
  reviewer_id                    UUID REFERENCES users(id),
  reviewer_notes                    TEXT,
  submitted_at                     TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at                       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_verification_submissions_dealer
  ON dealer_verification_submissions (dealer_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_submissions_pending
  ON dealer_verification_submissions (status, submitted_at ASC) WHERE status = 'pending';

-- ============================================================
-- Storage notes
-- ============================================================
-- Create a bucket named `dealer-verification-docs` and set it to
-- PRIVATE (unlike `vehicle-photos`, which is public) — these are CAC
-- certificates and government IDs. The backend uploads via the
-- service-role client (bypasses RLS/storage policy) and generates
-- short-lived SIGNED URLs when an admin needs to view a document for
-- review — see backend/services/verificationStorageService.ts.
-- No client (dealer or admin) ever gets a permanent public URL to
-- these files.
