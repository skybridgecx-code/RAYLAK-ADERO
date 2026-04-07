-- Phase 9Y: Chain integrity enforcement for portal submission threading

CREATE OR REPLACE FUNCTION "adero_validate_portal_submission_chain_integrity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  prior_record "adero_portal_submissions"%ROWTYPE;
  has_cycle boolean;
BEGIN
  IF NEW."supersedes_submission_id" IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT *
  INTO prior_record
  FROM "adero_portal_submissions"
  WHERE "id" = NEW."supersedes_submission_id";

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid supersedes_submission_id: % does not exist.', NEW."supersedes_submission_id";
  END IF;

  IF prior_record."member_type" <> NEW."member_type" THEN
    RAISE EXCEPTION 'Invalid chain link: member_type mismatch.';
  END IF;

  IF prior_record."document_type" <> NEW."document_type" THEN
    RAISE EXCEPTION 'Invalid chain link: document_type mismatch.';
  END IF;

  IF NEW."member_type" = 'company' THEN
    IF NEW."company_profile_id" IS DISTINCT FROM prior_record."company_profile_id" THEN
      RAISE EXCEPTION 'Invalid chain link: company_profile_id mismatch.';
    END IF;
  ELSIF NEW."member_type" = 'operator' THEN
    IF NEW."operator_profile_id" IS DISTINCT FROM prior_record."operator_profile_id" THEN
      RAISE EXCEPTION 'Invalid chain link: operator_profile_id mismatch.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid chain link: unsupported member_type %.', NEW."member_type";
  END IF;

  IF prior_record."created_at" > NEW."created_at" THEN
    RAISE EXCEPTION 'Invalid chain link: superseded submission is newer than current submission.';
  END IF;

  IF prior_record."status" = 'pending' THEN
    RAISE EXCEPTION 'Invalid chain link: cannot supersede a pending submission.';
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT s."id", s."supersedes_submission_id"
    FROM "adero_portal_submissions" s
    WHERE s."id" = NEW."supersedes_submission_id"

    UNION ALL

    SELECT s."id", s."supersedes_submission_id"
    FROM "adero_portal_submissions" s
    INNER JOIN ancestors a ON s."id" = a."supersedes_submission_id"
  )
  SELECT EXISTS(
    SELECT 1
    FROM ancestors
    WHERE "id" = NEW."id"
  ) INTO has_cycle;

  IF has_cycle THEN
    RAISE EXCEPTION 'Invalid chain link: cycle detected.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "adero_portal_submission_chain_integrity_trg"
ON "adero_portal_submissions";

CREATE TRIGGER "adero_portal_submission_chain_integrity_trg"
BEFORE INSERT OR UPDATE OF
  "supersedes_submission_id",
  "member_type",
  "company_profile_id",
  "operator_profile_id",
  "document_type",
  "created_at"
ON "adero_portal_submissions"
FOR EACH ROW
EXECUTE FUNCTION "adero_validate_portal_submission_chain_integrity"();
