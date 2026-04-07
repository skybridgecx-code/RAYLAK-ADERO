-- Phase 9M: Adero member-facing portal access tokens
-- Adds a portal_token column to both profile tables.
-- Each member gets a unique secret token; sharing /portal/[token] gives them
-- read-only access to their document/compliance status page.
-- Existing rows receive a token via gen_random_uuid() default.

ALTER TABLE "adero_company_profiles"
  ADD COLUMN IF NOT EXISTS "portal_token" uuid NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE "adero_operator_profiles"
  ADD COLUMN IF NOT EXISTS "portal_token" uuid NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS "adero_company_profiles_portal_token_uidx"
  ON "adero_company_profiles" ("portal_token");

CREATE UNIQUE INDEX IF NOT EXISTS "adero_operator_profiles_portal_token_uidx"
  ON "adero_operator_profiles" ("portal_token");
