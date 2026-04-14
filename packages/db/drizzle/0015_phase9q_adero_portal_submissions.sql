-- Phase 9Q: Adero member portal document submission records

CREATE TABLE IF NOT EXISTS "adero_portal_submissions" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "member_type"         text NOT NULL,
  "company_profile_id"  uuid REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id" uuid REFERENCES "adero_operator_profiles"("id"),
  "document_type"       text NOT NULL,
  "member_note"         text NOT NULL,
  "status"              text NOT NULL DEFAULT 'pending',
  "reviewed_by"         text,
  "review_note"         text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "adero_portal_submissions_member_ref_chk" CHECK (
    (
      "member_type" = 'company'
      AND "company_profile_id" IS NOT NULL
      AND "operator_profile_id" IS NULL
    ) OR (
      "member_type" = 'operator'
      AND "operator_profile_id" IS NOT NULL
      AND "company_profile_id" IS NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS "adero_portal_submissions_company_profile_idx"
  ON "adero_portal_submissions" ("company_profile_id", "created_at");

CREATE INDEX IF NOT EXISTS "adero_portal_submissions_operator_profile_idx"
  ON "adero_portal_submissions" ("operator_profile_id", "created_at");

CREATE INDEX IF NOT EXISTS "adero_portal_submissions_status_idx"
  ON "adero_portal_submissions" ("status");

CREATE INDEX IF NOT EXISTS "adero_portal_submissions_document_type_idx"
  ON "adero_portal_submissions" ("document_type");
