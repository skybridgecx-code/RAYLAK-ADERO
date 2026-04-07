-- Phase 9L: Adero internal compliance review notes and escalation workflow
-- 1. Extends adero_compliance_assignments with escalation state columns.
-- 2. Creates append-only adero_compliance_review_notes table.

-- ─── Extend assignment table with escalation ──────────────────────────────────

ALTER TABLE "adero_compliance_assignments"
  ADD COLUMN IF NOT EXISTS "escalation_status" text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS "escalation_note"   text;

CREATE INDEX IF NOT EXISTS "adero_compliance_assignments_escalation_status_idx"
  ON "adero_compliance_assignments" ("escalation_status");

-- ─── Review notes ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "adero_compliance_review_notes" (
  "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_type"         text        NOT NULL,
  "company_profile_id"  uuid        REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id" uuid        REFERENCES "adero_operator_profiles"("id"),
  "document_type"       text        NOT NULL,
  "note"                text        NOT NULL,
  "actor_name"          text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "adero_compliance_review_notes_member_ref_chk" CHECK (
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

CREATE INDEX IF NOT EXISTS "adero_compliance_review_notes_company_profile_idx"
  ON "adero_compliance_review_notes" ("company_profile_id", "document_type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "adero_compliance_review_notes_operator_profile_idx"
  ON "adero_compliance_review_notes" ("operator_profile_id", "document_type", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "adero_compliance_review_notes_member_type_idx"
  ON "adero_compliance_review_notes" ("member_type");

CREATE INDEX IF NOT EXISTS "adero_compliance_review_notes_created_at_idx"
  ON "adero_compliance_review_notes" ("created_at" DESC);
