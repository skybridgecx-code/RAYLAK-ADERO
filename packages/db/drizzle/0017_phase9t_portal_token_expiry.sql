-- Phase 9T: Adero portal token expiry controls
-- Adds an optional expiry timestamp to portal tokens on both profile tables.
-- NULL = no expiry (active indefinitely). Set to a past timestamp to block access.
-- Staff can "expire now" without rotating, or rotate (which always clears expiry).

ALTER TABLE "adero_company_profiles"
  ADD COLUMN IF NOT EXISTS "portal_token_expires_at" timestamptz;

ALTER TABLE "adero_operator_profiles"
  ADD COLUMN IF NOT EXISTS "portal_token_expires_at" timestamptz;
