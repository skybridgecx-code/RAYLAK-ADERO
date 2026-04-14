-- Phase 9B: Adero network application tables
-- Standalone tables — no FK to RAYLAK's users table.
-- Applicants are not RAYLAK users; Adero reviews them independently.

-- Transportation company applications
CREATE TABLE IF NOT EXISTS "adero_company_applications" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_name"      text        NOT NULL,
  "website"           text,
  "contact_first_name" text       NOT NULL,
  "contact_last_name" text        NOT NULL,
  "email"             text        NOT NULL,
  "phone"             text,
  "fleet_size"        integer,
  "service_markets"   text        NOT NULL,
  "overflow_needs"    text,
  "status"            text        NOT NULL DEFAULT 'pending',
  "internal_notes"    text,
  "submitted_at"      timestamptz NOT NULL DEFAULT now(),
  "reviewed_at"       timestamptz,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_company_apps_email_idx"      ON "adero_company_applications"("email");
CREATE INDEX IF NOT EXISTS "adero_company_apps_status_idx"     ON "adero_company_applications"("status");
CREATE INDEX IF NOT EXISTS "adero_company_apps_created_at_idx" ON "adero_company_applications"("created_at" DESC);

-- Independent operator / chauffeur applications
CREATE TABLE IF NOT EXISTS "adero_operator_applications" (
  "id"                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "first_name"           text        NOT NULL,
  "last_name"            text        NOT NULL,
  "email"                text        NOT NULL,
  "phone"                text,
  "city"                 text        NOT NULL,
  "state"                text,
  "vehicle_type"         text        NOT NULL,
  "vehicle_year"         integer,
  "years_experience"     integer,
  "current_affiliations" text,
  "bio"                  text,
  "status"               text        NOT NULL DEFAULT 'pending',
  "internal_notes"       text,
  "submitted_at"         timestamptz NOT NULL DEFAULT now(),
  "reviewed_at"          timestamptz,
  "created_at"           timestamptz NOT NULL DEFAULT now(),
  "updated_at"           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "adero_operator_apps_email_idx"      ON "adero_operator_applications"("email");
CREATE INDEX IF NOT EXISTS "adero_operator_apps_status_idx"     ON "adero_operator_applications"("status");
CREATE INDEX IF NOT EXISTS "adero_operator_apps_created_at_idx" ON "adero_operator_applications"("created_at" DESC);
