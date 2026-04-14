-- Phase 9K: Adero internal compliance dashboard and assignment workflow
-- Adds a mutable assignment table for tracking who owns each open compliance issue.
-- One row per (member_type + profile_id + document_type), upserted on reassign.

CREATE TABLE IF NOT EXISTS "adero_compliance_assignments" (
  "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_type"         text        NOT NULL,
  "company_profile_id"  uuid        REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id" uuid        REFERENCES "adero_operator_profiles"("id"),
  "document_type"       text        NOT NULL,
  "assigned_to"         text        NOT NULL,
  "assigned_by"         text,
  "notes"               text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  "updated_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "adero_compliance_assignments_member_ref_chk" CHECK (
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

-- Partial unique indexes: one assignment per compliance issue
CREATE UNIQUE INDEX IF NOT EXISTS "adero_compliance_assignments_company_doc_uniq"
  ON "adero_compliance_assignments" ("company_profile_id", "document_type")
  WHERE "member_type" = 'company';

CREATE UNIQUE INDEX IF NOT EXISTS "adero_compliance_assignments_operator_doc_uniq"
  ON "adero_compliance_assignments" ("operator_profile_id", "document_type")
  WHERE "member_type" = 'operator';

CREATE INDEX IF NOT EXISTS "adero_compliance_assignments_assigned_to_idx"
  ON "adero_compliance_assignments" ("assigned_to");

CREATE INDEX IF NOT EXISTS "adero_compliance_assignments_member_type_idx"
  ON "adero_compliance_assignments" ("member_type");

CREATE INDEX IF NOT EXISTS "adero_compliance_assignments_updated_at_idx"
  ON "adero_compliance_assignments" ("updated_at" DESC);
