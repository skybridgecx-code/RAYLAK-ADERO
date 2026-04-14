-- Phase 10D: Adero internal member notes and staff annotation layer

CREATE TABLE IF NOT EXISTS "adero_member_notes" (
  "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "member_type"         text        NOT NULL,
  "company_profile_id"  uuid        REFERENCES "adero_company_profiles"("id"),
  "operator_profile_id" uuid        REFERENCES "adero_operator_profiles"("id"),
  "body"                text        NOT NULL,
  "actor_name"          text,
  "created_at"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "adero_member_notes_member_ref_chk" CHECK (
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

CREATE INDEX IF NOT EXISTS "adero_member_notes_company_profile_idx"
  ON "adero_member_notes" ("company_profile_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "adero_member_notes_operator_profile_idx"
  ON "adero_member_notes" ("operator_profile_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "adero_member_notes_created_at_idx"
  ON "adero_member_notes" ("created_at" DESC);
