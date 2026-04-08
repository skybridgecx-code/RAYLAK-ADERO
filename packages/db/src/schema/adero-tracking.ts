import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { aderoTrips } from "./adero-trips";
import { aderoUsers } from "./adero-users";

export const aderoLocationSourceEnum = pgEnum("adero_location_source", [
  "gps",
  "manual",
  "network",
  "fused",
]);

export const aderoGeofenceEventTypeEnum = pgEnum("adero_geofence_event_type", [
  "entered_pickup_zone",
  "exited_pickup_zone",
  "entered_dropoff_zone",
  "exited_dropoff_zone",
  "entered_custom_zone",
]);

export const aderoEtaStatusEnum = pgEnum("adero_eta_status", [
  "calculating",
  "on_track",
  "delayed",
  "arrived",
  "unavailable",
]);

export const aderoTripLocations = pgTable(
  "adero_trip_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => aderoTrips.id),
    operatorUserId: uuid("operator_user_id")
      .notNull()
      .references(() => aderoUsers.id),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    altitude: numeric("altitude", { precision: 8, scale: 2 }),
    heading: numeric("heading", { precision: 5, scale: 1 }),
    speed: numeric("speed", { precision: 6, scale: 2 }),
    accuracy: numeric("accuracy", { precision: 8, scale: 2 }),
    source: aderoLocationSourceEnum("source").notNull().default("gps"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("adero_trip_locations_trip_recorded_at_idx").on(t.tripId, t.recordedAt.desc()),
    index("adero_trip_locations_operator_recorded_at_idx").on(
      t.operatorUserId,
      t.recordedAt.desc(),
    ),
  ],
);

export const aderoTripEtas = pgTable(
  "adero_trip_etas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => aderoTrips.id),
    status: aderoEtaStatusEnum("status").notNull().default("calculating"),
    estimatedArrivalAt: timestamp("estimated_arrival_at", { withTimezone: true }),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    estimatedDistanceMiles: numeric("estimated_distance_miles", { precision: 8, scale: 2 }),
    distanceRemainingMiles: numeric("distance_remaining_miles", { precision: 8, scale: 2 }),
    currentLatitude: numeric("current_latitude", { precision: 10, scale: 7 }),
    currentLongitude: numeric("current_longitude", { precision: 10, scale: 7 }),
    destinationLatitude: numeric("destination_latitude", { precision: 10, scale: 7 }),
    destinationLongitude: numeric("destination_longitude", { precision: 10, scale: 7 }),
    destinationType: text("destination_type").notNull().default("pickup"),
    routePolyline: text("route_polyline"),
    calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("adero_trip_etas_trip_created_at_idx").on(t.tripId, t.createdAt.desc())],
);

export const aderoGeofenceEvents = pgTable(
  "adero_geofence_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => aderoTrips.id),
    operatorUserId: uuid("operator_user_id")
      .notNull()
      .references(() => aderoUsers.id),
    eventType: aderoGeofenceEventTypeEnum("event_type").notNull(),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    radiusMeters: numeric("radius_meters", { precision: 8, scale: 2 }).notNull(),
    triggerLatitude: numeric("trigger_latitude", { precision: 10, scale: 7 }).notNull(),
    triggerLongitude: numeric("trigger_longitude", { precision: 10, scale: 7 }).notNull(),
    metadata: jsonb("metadata"),
    triggeredAt: timestamp("triggered_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("adero_geofence_events_trip_triggered_at_idx").on(t.tripId, t.triggeredAt.desc())],
);

export const aderoOperatorLastLocations = pgTable(
  "adero_operator_last_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatorUserId: uuid("operator_user_id")
      .notNull()
      .references(() => aderoUsers.id),
    latitude: numeric("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: numeric("longitude", { precision: 10, scale: 7 }).notNull(),
    heading: numeric("heading", { precision: 5, scale: 1 }),
    speed: numeric("speed", { precision: 6, scale: 2 }),
    accuracy: numeric("accuracy", { precision: 8, scale: 2 }),
    activeTripId: uuid("active_trip_id").references(() => aderoTrips.id),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("adero_operator_last_locations_operator_user_id_uidx").on(t.operatorUserId)],
);

export const aderoTrackingSessions = pgTable("adero_tracking_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => aderoTrips.id),
  operatorUserId: uuid("operator_user_id")
    .notNull()
    .references(() => aderoUsers.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  locationCount: integer("location_count").notNull().default(0),
  totalDistanceMiles: numeric("total_distance_miles", { precision: 10, scale: 2 }),
  averageSpeedMph: numeric("average_speed_mph", { precision: 6, scale: 2 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AderoTripLocation = typeof aderoTripLocations.$inferSelect;
export type NewAderoTripLocation = typeof aderoTripLocations.$inferInsert;

export type AderoTripEta = typeof aderoTripEtas.$inferSelect;
export type NewAderoTripEta = typeof aderoTripEtas.$inferInsert;

export type AderoGeofenceEvent = typeof aderoGeofenceEvents.$inferSelect;
export type NewAderoGeofenceEvent = typeof aderoGeofenceEvents.$inferInsert;

export type AderoOperatorLastLocation = typeof aderoOperatorLastLocations.$inferSelect;
export type NewAderoOperatorLastLocation = typeof aderoOperatorLastLocations.$inferInsert;

export type AderoTrackingSession = typeof aderoTrackingSessions.$inferSelect;
export type NewAderoTrackingSession = typeof aderoTrackingSessions.$inferInsert;
