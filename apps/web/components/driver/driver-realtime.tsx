"use client";

import { useRealtimeRides } from "~/hooks/use-realtime-rides";
import { LocationTracker } from "./location-tracker";

/**
 * Client shell that wires up driver-side realtime features:
 *  1. LocationTracker — watchPosition → ride.updateLocation mutation
 *  2. useRealtimeRides — /rides Socket.io → router.refresh() on assignment events
 *
 * Renders nothing visible. Mount once inside the driver layout.
 */
export function DriverRealtime() {
  // Just mounting this hook connects to the /rides namespace and refreshes on events
  useRealtimeRides();

  return <LocationTracker />;
}
