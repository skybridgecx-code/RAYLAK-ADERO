-- Phase 9G: Adero internal audit trail
-- Records internal application/profile lifecycle and maintenance changes.

CREATE TABLE IF NOT EXISTS "adero_audit_logs" (
  "id"                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_type"             text        NOT NULL,
  "entity_id"               uuid        NOT NULL,
  "application_id"          uuid,
  "company_application_id"  uuid        REFERENCES "adero_company_applications"("id"),
  "operator_application_id" uuid        REFERENCES "adero_operator_applications"("id"),
  "company_profile_id"      uuid        REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id"     uuid        REFERENCES "adero_operator_profiles"("id"),
  "action"                  text        NOT NULL,
  "actor_name"              text,
  "summary"                 text        NOT NULL,
  "details"                 text,
  "created_at"              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_audit_logs_entity_idx"
  ON "adero_audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "adero_audit_logs_application_id_idx"
  ON "adero_audit_logs"("application_id");
CREATE INDEX IF NOT EXISTS "adero_audit_logs_company_application_idx"
  ON "adero_audit_logs"("company_application_id");
CREATE INDEX IF NOT EXISTS "adero_audit_logs_operator_application_idx"
  ON "adero_audit_logs"("operator_application_id");
CREATE INDEX IF NOT EXISTS "adero_audit_logs_company_profile_idx"
  ON "adero_audit_logs"("company_profile_id");
CREATE INDEX IF NOT EXISTS "adero_audit_logs_operator_profile_idx"
  ON "adero_audit_logs"("operator_profile_id");
CREATE INDEX IF NOT EXISTS "adero_audit_logs_created_at_idx"
  ON "adero_audit_logs"("created_at" DESC);
