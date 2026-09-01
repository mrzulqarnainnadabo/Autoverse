-- AV Drive — add conversation_id for job-anchored chat (run after av_drive_schema.sql)

ALTER TABLE av_drive_jobs
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_av_drive_jobs_conversation
  ON av_drive_jobs (conversation_id)
  WHERE conversation_id IS NOT NULL;
