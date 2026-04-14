-- Phase 11B: Adero request / booking creation flow

CREATE TABLE IF NOT EXISTS "adero_requests" (
  "id"                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "requester_id"       uuid        NOT NULL REFERENCES "adero_users"("id"),
  "service_type"       text        NOT NULL,
  "pickup_address"     text        NOT NULL,
  "dropoff_address"    text        NOT NULL,
  "pickup_at"          timestamptz NOT NULL,
  "passenger_count"    integer     NOT NULL,
  "vehicle_preference" text,
  "notes"              text,
  "status"             text        NOT NULL DEFAULT 'submitted',
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_requests_requester_id_idx"
  ON "adero_requests" ("requester_id");

CREATE INDEX IF NOT EXISTS "adero_requests_status_idx"
  ON "adero_requests" ("status");

CREATE INDEX IF NOT EXISTS "adero_requests_pickup_at_idx"
  ON "adero_requests" ("pickup_at");

CREATE INDEX IF NOT EXISTS "adero_requests_created_at_idx"
  ON "adero_requests" ("created_at" DESC);
