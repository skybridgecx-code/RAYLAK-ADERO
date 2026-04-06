-- Phase 2: Customer Website & Booking Intake
-- Run this migration against the database after Phase 1 schema is in place.

-- 1. Make clerk_id nullable to support guest customer records.
--    Guest records created during booking intake have no Clerk account yet;
--    the Clerk webhook links the clerkId when the customer eventually signs up.
ALTER TABLE "users" ALTER COLUMN "clerk_id" DROP NOT NULL;

-- 2. Add acquisition_source to bookings for customer acquisition tracking.
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "acquisition_source" text;
