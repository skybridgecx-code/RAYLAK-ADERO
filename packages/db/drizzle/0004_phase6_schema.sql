-- Phase 6: driver location fields + notifications table

-- Driver location (latest GPS snapshot, overwritten on each update)
ALTER TABLE "driver_profiles"
  ADD COLUMN IF NOT EXISTS "last_lat"         numeric(10,7),
  ADD COLUMN IF NOT EXISTS "last_lng"         numeric(10,7),
  ADD COLUMN IF NOT EXISTS "last_heading"     integer,
  ADD COLUMN IF NOT EXISTS "last_speed"       numeric(6,2),
  ADD COLUMN IF NOT EXISTS "last_location_at" timestamp with time zone;

-- Internal notification records
CREATE TABLE IF NOT EXISTS "notifications" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"       text NOT NULL,
  "title"      text NOT NULL,
  "body"       text,
  "data"       jsonb,
  "channel"    text NOT NULL DEFAULT 'in_app',
  "sent_at"    timestamp with time zone,
  "read_at"    timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notifications_user_id_idx"   ON "notifications"("user_id");
CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "notifications"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "notifications_read_at_idx"   ON "notifications"("read_at");
