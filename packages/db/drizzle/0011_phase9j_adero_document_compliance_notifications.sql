-- Phase 9J: Adero internal document compliance actions and notification scaffolding
-- Adds immutable internal compliance records used for follow-up history and notification views.

CREATE TABLE IF NOT EXISTS "adero_document_compliance_notifications" (
  "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_type"         text        NOT NULL,
  "company_profile_id"  uuid        REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id" uuid        REFERENCES "adero_operator_profiles"("id"),
  "document_id"         uuid        REFERENCES "adero_member_documents"("id"),
  "document_type"       text        NOT NULL,
  "action_type"         text        NOT NULL,
  "title"               text        NOT NULL,
  "body"                text,
  "notes"               text,
  "actor_name"          text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "adero_document_compliance_notifications_member_ref_chk" CHECK (
    (
      "member_type" = 'company' AND
      "company_profile_id" IS NOT NULL AND
      "operator_profile_id" IS NULL
    ) OR (
      "member_type" = 'operator' AND
      "operator_profile_id" IS NOT NULL AND
      "company_profile_id" IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS "adero_document_compliance_notifications_document_idx"
  ON "adero_document_compliance_notifications"("document_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "adero_document_compliance_notifications_company_profile_idx"
  ON "adero_document_compliance_notifications"("company_profile_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "adero_document_compliance_notifications_operator_profile_idx"
  ON "adero_document_compliance_notifications"("operator_profile_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "adero_document_compliance_notifications_action_idx"
  ON "adero_document_compliance_notifications"("action_type");
CREATE INDEX IF NOT EXISTS "adero_document_compliance_notifications_document_type_idx"
  ON "adero_document_compliance_notifications"("document_type");
CREATE INDEX IF NOT EXISTS "adero_document_compliance_notifications_created_at_idx"
  ON "adero_document_compliance_notifications"("created_at" DESC);
