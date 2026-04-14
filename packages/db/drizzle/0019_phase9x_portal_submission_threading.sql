-- Phase 9X: Explicit portal submission threading + deterministic supersession

ALTER TABLE "adero_portal_submissions"
  ADD COLUMN IF NOT EXISTS "supersedes_submission_id" uuid;

ALTER TABLE "adero_portal_submissions"
  DROP CONSTRAINT IF EXISTS "adero_portal_submissions_supersedes_fk";

ALTER TABLE "adero_portal_submissions"
  ADD CONSTRAINT "adero_portal_submissions_supersedes_fk"
  FOREIGN KEY ("supersedes_submission_id")
  REFERENCES "adero_portal_submissions"("id")
  ON DELETE SET NULL;

ALTER TABLE "adero_portal_submissions"
  DROP CONSTRAINT IF EXISTS "adero_portal_submissions_no_self_supersede_chk";

ALTER TABLE "adero_portal_submissions"
  ADD CONSTRAINT "adero_portal_submissions_no_self_supersede_chk"
  CHECK ("supersedes_submission_id" IS NULL OR "supersedes_submission_id" <> "id");

-- Backfill inferred chains by member + document type, oldest->newest.
-- Each row supersedes the immediate prior row in the same lane.
WITH ordered AS (
  SELECT
    "id",
    LAG("id") OVER (
      PARTITION BY "member_type", COALESCE("company_profile_id", "operator_profile_id"), "document_type"
      ORDER BY "created_at" ASC, "id" ASC
    ) AS "prior_submission_id"
  FROM "adero_portal_submissions"
)
UPDATE "adero_portal_submissions" AS target
SET "supersedes_submission_id" = ordered."prior_submission_id"
FROM ordered
WHERE target."id" = ordered."id"
  AND ordered."prior_submission_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "adero_portal_submissions_supersedes_idx"
  ON "adero_portal_submissions" ("supersedes_submission_id");

CREATE UNIQUE INDEX IF NOT EXISTS "adero_portal_submissions_supersedes_unique_idx"
  ON "adero_portal_submissions" ("supersedes_submission_id")
  WHERE "supersedes_submission_id" IS NOT NULL;
