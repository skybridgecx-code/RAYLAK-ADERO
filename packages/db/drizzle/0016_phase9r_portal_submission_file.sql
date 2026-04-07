-- Phase 9R: Add S3 file attachment columns to adero_portal_submissions

ALTER TABLE "adero_portal_submissions"
  ADD COLUMN IF NOT EXISTS "file_key"        text,
  ADD COLUMN IF NOT EXISTS "file_name"       text,
  ADD COLUMN IF NOT EXISTS "file_size_bytes" integer;
