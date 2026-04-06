-- Phase 5: Driver availability status
-- Additive — adds availability_status to driver_profiles

ALTER TABLE "driver_profiles"
  ADD COLUMN IF NOT EXISTS "availability_status" text NOT NULL DEFAULT 'offline';
