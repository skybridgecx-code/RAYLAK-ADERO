-- Phase 11F: Adero live status notifications

CREATE TABLE IF NOT EXISTS "adero_notifications" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    uuid        NOT NULL REFERENCES "adero_users"("id") ON DELETE CASCADE,
  "type"       text        NOT NULL,
  "title"      text        NOT NULL,
  "message"    text        NOT NULL,
  "metadata"   text,
  "read_at"    timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_notifications_user_id_idx"
  ON "adero_notifications" ("user_id");

CREATE INDEX IF NOT EXISTS "adero_notifications_type_idx"
  ON "adero_notifications" ("type");

CREATE INDEX IF NOT EXISTS "adero_notifications_created_at_idx"
  ON "adero_notifications" ("created_at");

CREATE INDEX IF NOT EXISTS "adero_notifications_read_at_idx"
  ON "adero_notifications" ("read_at");
