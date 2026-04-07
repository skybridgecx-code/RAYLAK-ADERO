-- Phase 9V: Bounded portal submission review outcomes
-- Moves legacy statuses to the Phase 9V review model and enforces allowed values.

UPDATE "adero_portal_submissions"
SET "status" = 'accepted'
WHERE "status" = 'reviewed';

UPDATE "adero_portal_submissions"
SET "status" = 'rejected'
WHERE "status" = 'dismissed';

ALTER TABLE "adero_portal_submissions"
  DROP CONSTRAINT IF EXISTS "adero_portal_submissions_status_chk";

ALTER TABLE "adero_portal_submissions"
  ADD CONSTRAINT "adero_portal_submissions_status_chk"
  CHECK ("status" IN ('pending', 'accepted', 'rejected', 'needs_follow_up'));
