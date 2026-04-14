-- Phase 11C: Adero operator availability and acceptance workflow

CREATE TABLE IF NOT EXISTS "adero_operator_availability" (
  "id"                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             uuid        NOT NULL REFERENCES "adero_users"("id"),
  "availability_status" text        NOT NULL DEFAULT 'offline',
  "service_area"        text,
  "updated_at"          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "adero_operator_availability_user_id_uidx"
  ON "adero_operator_availability" ("user_id");

CREATE INDEX IF NOT EXISTS "adero_operator_availability_status_idx"
  ON "adero_operator_availability" ("availability_status");

CREATE TABLE IF NOT EXISTS "adero_request_offers" (
  "id"          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id"  uuid        NOT NULL REFERENCES "adero_requests"("id"),
  "operator_id" uuid        NOT NULL REFERENCES "adero_users"("id"),
  "status"      text        NOT NULL DEFAULT 'pending',
  "offered_at"  timestamptz NOT NULL DEFAULT now(),
  "responded_at" timestamptz,
  "created_at"  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_request_offers_request_id_idx"
  ON "adero_request_offers" ("request_id");

CREATE INDEX IF NOT EXISTS "adero_request_offers_operator_id_idx"
  ON "adero_request_offers" ("operator_id");

CREATE INDEX IF NOT EXISTS "adero_request_offers_status_idx"
  ON "adero_request_offers" ("status");

CREATE INDEX IF NOT EXISTS "adero_request_offers_offered_at_idx"
  ON "adero_request_offers" ("offered_at");
