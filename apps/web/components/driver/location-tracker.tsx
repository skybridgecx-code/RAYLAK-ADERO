"use client";

import { useEffect, useRef } from "react";
import { trpc } from "~/lib/trpc/client";

/** Minimum ms between location updates sent to the server */
const THROTTLE_MS = 10_000;

/** Minimum distance (meters) to trigger an update even if under throttle time */
const MIN_DISTANCE_M = 30;

function haversineDistanceM(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Invisible component that tracks the driver's location via
 * navigator.geolocation.watchPosition and sends throttled updates to the server.
 *
 * Mount this once inside a layout that is always active while the driver is
 * in the driver app. Stops tracking when the component unmounts or the
 * document is hidden (screen off / tab switched).
 */
export function LocationTracker() {
  const updateLocation = trpc.ride.updateLocation.useMutation();

  const watchIdRef = useRef<number | null>(null);
  const lastSentAtRef = useRef<number>(0);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  // Keep a stable ref to the mutation so the watchPosition callback
  // doesn't capture a stale closure.
  const mutateRef = useRef(updateLocation.mutate);
  mutateRef.current = updateLocation.mutate;

  useEffect(() => {
    function sendLocation(position: GeolocationPosition) {
      const { latitude: lat, longitude: lng, heading, speed } = position.coords;
      const now = Date.now();
      const sinceLastMs = now - lastSentAtRef.current;
      const lastPos = lastPositionRef.current;
      const distM = lastPos
        ? haversineDistanceM(lastPos.lat, lastPos.lng, lat, lng)
        : Infinity;

      // Only send if enough time has passed OR the driver has moved significantly
      if (sinceLastMs < THROTTLE_MS && distM < MIN_DISTANCE_M) return;

      lastSentAtRef.current = now;
      lastPositionRef.current = { lat, lng };

      mutateRef.current({
        lat,
        lng,
        ...(heading !== null && heading !== undefined && { heading: Math.round(heading) }),
        ...(speed !== null && speed !== undefined && { speed: Math.max(0, speed * 3.6) }), // m/s → km/h
      });
    }

    function startWatch() {
      if (!navigator.geolocation) return;
      if (watchIdRef.current !== null) return;

      watchIdRef.current = navigator.geolocation.watchPosition(
        sendLocation,
        (err) => {
          console.warn("[LocationTracker] Geolocation error:", err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 5_000,
        },
      );
    }

    function stopWatch() {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    startWatch();

    function handleVisibilityChange() {
      if (document.hidden) {
        stopWatch();
      } else {
        startWatch();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopWatch();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Renders nothing — purely side-effectful
  return null;
}
