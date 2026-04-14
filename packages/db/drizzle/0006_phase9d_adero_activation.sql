-- Phase 9D: Adero applicant activation state
-- Adds reviewer attribution and activation timestamp to both application tables.

ALTER TABLE adero_company_applications
  ADD COLUMN IF NOT EXISTS reviewed_by   TEXT,
  ADD COLUMN IF NOT EXISTS activated_at  TIMESTAMPTZ;

ALTER TABLE adero_operator_applications
  ADD COLUMN IF NOT EXISTS reviewed_by   TEXT,
  ADD COLUMN IF NOT EXISTS activated_at  TIMESTAMPTZ;
