-- Phase 3: Operator Dashboard — Vehicle/Driver Management
-- Run after 0001_phase2_schema.sql is applied.

-- Add Phase 3 vehicle columns
ALTER TABLE "vehicles"
  ADD COLUMN IF NOT EXISTS "luggage_capacity" integer,
  ADD COLUMN IF NOT EXISTS "amenities"        text;
