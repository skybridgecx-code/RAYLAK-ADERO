-- Phase 11D: Adero trip / job lifecycle state machine

CREATE TABLE IF NOT EXISTS "adero_trips" (
  "id"              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id"      uuid        NOT NULL REFERENCES "adero_requests"("id"),
  "operator_id"     uuid        NOT NULL REFERENCES "adero_users"("id"),
  "status"          text        NOT NULL DEFAULT 'assigned',
  "pickup_address"  text        NOT NULL,
  "dropoff_address" text        NOT NULL,
  "scheduled_at"    timestamptz,
  "started_at"      timestamptz,
  "completed_at"    timestamptz,
  "canceled_at"     timestamptz,
  "cancel_reason"   text,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_trips_request_id_idx"
  ON "adero_trips" ("request_id");

CREATE INDEX IF NOT EXISTS "adero_trips_operator_id_idx"
  ON "adero_trips" ("operator_id");

CREATE INDEX IF NOT EXISTS "adero_trips_status_idx"
  ON "adero_trips" ("status");

CREATE INDEX IF NOT EXISTS "adero_trips_scheduled_at_idx"
  ON "adero_trips" ("scheduled_at");

CREATE INDEX IF NOT EXISTS "adero_trips_created_at_idx"
  ON "adero_trips" ("created_at");

CREATE TABLE IF NOT EXISTS "adero_trip_status_log" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "trip_id"     uuid        NOT NULL REFERENCES "adero_trips"("id") ON DELETE CASCADE,
  "from_status" text        NOT NULL,
  "to_status"   text        NOT NULL,
  "changed_by"  uuid        NOT NULL REFERENCES "adero_users"("id"),
  "note"        text,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_trip_status_log_trip_id_idx"
  ON "adero_trip_status_log" ("trip_id");

CREATE INDEX IF NOT EXISTS "adero_trip_status_log_changed_by_idx"
  ON "adero_trip_status_log" ("changed_by");

CREATE INDEX IF NOT EXISTS "adero_trip_status_log_created_at_idx"
  ON "adero_trip_status_log" ("created_at");
