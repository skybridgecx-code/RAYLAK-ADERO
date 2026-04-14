-- Phase 9H: Adero internal member document tracking
-- Adds metadata-only document records for activated company and operator profiles.

CREATE TABLE IF NOT EXISTS "adero_member_documents" (
  "id"                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_type"        text        NOT NULL,
  "company_profile_id" uuid        REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id" uuid       REFERENCES "adero_operator_profiles"("id"),
  "title"              text        NOT NULL,
  "document_type"      text        NOT NULL,
  "status"             text        NOT NULL,
  "expiration_date"    date,
  "notes"              text,
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "adero_member_documents_member_ref_chk" CHECK (
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

CREATE INDEX IF NOT EXISTS "adero_member_documents_company_profile_idx"
  ON "adero_member_documents"("company_profile_id", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "adero_member_documents_operator_profile_idx"
  ON "adero_member_documents"("operator_profile_id", "updated_at" DESC);
CREATE INDEX IF NOT EXISTS "adero_member_documents_member_type_idx"
  ON "adero_member_documents"("member_type");
CREATE INDEX IF NOT EXISTS "adero_member_documents_document_type_idx"
  ON "adero_member_documents"("document_type");
CREATE INDEX IF NOT EXISTS "adero_member_documents_status_idx"
  ON "adero_member_documents"("status");
CREATE INDEX IF NOT EXISTS "adero_member_documents_expiration_date_idx"
  ON "adero_member_documents"("expiration_date");
