-- Phase 9E: Adero activated member profiles
-- Creates internal post-activation profile records while preserving source applications.

CREATE TABLE IF NOT EXISTS "adero_company_profiles" (
  "id"                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id"    uuid        NOT NULL REFERENCES "adero_company_applications"("id"),
  "company_name"      text        NOT NULL,
  "service_area"      text        NOT NULL,
  "contact_name"      text        NOT NULL,
  "email"             text        NOT NULL,
  "phone"             text,
  "website"           text,
  "fleet_size"        integer,
  "service_notes"     text,
  "activation_status" text        NOT NULL DEFAULT 'activated',
  "activated_at"      timestamptz NOT NULL,
  "created_at"        timestamptz NOT NULL DEFAULT now(),
  "updated_at"        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "adero_company_profiles_application_id_uidx"
  ON "adero_company_profiles"("application_id");
CREATE INDEX IF NOT EXISTS "adero_company_profiles_status_idx"
  ON "adero_company_profiles"("activation_status");
CREATE INDEX IF NOT EXISTS "adero_company_profiles_company_name_idx"
  ON "adero_company_profiles"("company_name");
CREATE INDEX IF NOT EXISTS "adero_company_profiles_activated_at_idx"
  ON "adero_company_profiles"("activated_at" DESC);

CREATE TABLE IF NOT EXISTS "adero_operator_profiles" (
  "id"                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id"     uuid        NOT NULL REFERENCES "adero_operator_applications"("id"),
  "full_name"          text        NOT NULL,
  "city"               text        NOT NULL,
  "state"              text,
  "email"              text        NOT NULL,
  "phone"              text,
  "vehicle_type"       text        NOT NULL,
  "vehicle_year"       integer,
  "years_experience"   integer,
  "service_notes"      text,
  "activation_status"  text        NOT NULL DEFAULT 'activated',
  "activated_at"       timestamptz NOT NULL,
  "created_at"         timestamptz NOT NULL DEFAULT now(),
  "updated_at"         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "adero_operator_profiles_application_id_uidx"
  ON "adero_operator_profiles"("application_id");
CREATE INDEX IF NOT EXISTS "adero_operator_profiles_status_idx"
  ON "adero_operator_profiles"("activation_status");
CREATE INDEX IF NOT EXISTS "adero_operator_profiles_full_name_idx"
  ON "adero_operator_profiles"("full_name");
CREATE INDEX IF NOT EXISTS "adero_operator_profiles_activated_at_idx"
  ON "adero_operator_profiles"("activated_at" DESC);

INSERT INTO "adero_company_profiles" (
  "application_id",
  "company_name",
  "service_area",
  "contact_name",
  "email",
  "phone",
  "website",
  "fleet_size",
  "service_notes",
  "activation_status",
  "activated_at"
)
SELECT
  "id",
  "company_name",
  "service_markets",
  concat_ws(' ', "contact_first_name", "contact_last_name"),
  "email",
  "phone",
  "website",
  "fleet_size",
  "overflow_needs",
  "status",
  COALESCE("activated_at", "updated_at", now())
FROM "adero_company_applications"
WHERE "status" = 'activated'
ON CONFLICT ("application_id") DO NOTHING;

INSERT INTO "adero_operator_profiles" (
  "application_id",
  "full_name",
  "city",
  "state",
  "email",
  "phone",
  "vehicle_type",
  "vehicle_year",
  "years_experience",
  "service_notes",
  "activation_status",
  "activated_at"
)
SELECT
  "id",
  concat_ws(' ', "first_name", "last_name"),
  "city",
  "state",
  "email",
  "phone",
  "vehicle_type",
  "vehicle_year",
  "years_experience",
  NULLIF(
    concat_ws(E'\n\n',
      CASE
        WHEN "current_affiliations" IS NOT NULL AND "current_affiliations" <> ''
          THEN 'Current affiliations: ' || "current_affiliations"
      END,
      CASE
        WHEN "bio" IS NOT NULL AND "bio" <> ''
          THEN "bio"
      END
    ),
    ''
  ),
  "status",
  COALESCE("activated_at", "updated_at", now())
FROM "adero_operator_applications"
WHERE "status" = 'activated'
ON CONFLICT ("application_id") DO NOTHING;
