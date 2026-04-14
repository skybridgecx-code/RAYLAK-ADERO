-- Phase 9F: Adero profile lifecycle controls
-- Reuses activation_status for member lifecycle: active | paused | inactive.

ALTER TABLE "adero_company_profiles"
  ALTER COLUMN "activation_status" SET DEFAULT 'active';

ALTER TABLE "adero_operator_profiles"
  ALTER COLUMN "activation_status" SET DEFAULT 'active';

UPDATE "adero_company_profiles"
SET "activation_status" = 'active',
    "updated_at" = now()
WHERE "activation_status" = 'activated';

UPDATE "adero_operator_profiles"
SET "activation_status" = 'active',
    "updated_at" = now()
WHERE "activation_status" = 'activated';
