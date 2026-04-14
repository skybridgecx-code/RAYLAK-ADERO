"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LocationTrackerProps = {
  tripId: string;
  tripStatus: string;
  operatorUserId: string;
};

type TrackingSessionResponse = {
  session?: { id: string } | null;
  error?: string;
};

type RecordLocationResponse = {
  recorded: boolean;
  reason?: string;
};

const ACTIVE_TRIP_STATUSES = new Set([
  "operator_en_route",
  "operator_arrived",
  "in_progress",
]);

function formatRelativeTime(dateInput: Date | string): string {
  const timestamp = new Date(dateInput).getTime();
  if (!Number.isFinite(timestamp)) return "Unknown";

  const deltaMs = Date.now() - timestamp;
  if (deltaMs < 10_000) return "Just now";

  const sec = Math.floor(deltaMs / 1000);
  if (sec < 60) return `${sec}s ago`;

  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;

  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function headingToCompass(heading: number | null | undefined): string | null {
  if (heading === null || heading === undefined || !Number.isFinite(heading)) return null;
  const normalized = ((heading % 360) + 360) % 360;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(normalized / 45) % 8;
  return directions[index] ?? null;
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location access denied — please enable location services.";
    case error.POSITION_UNAVAILABLE:
      return "Location services not available on this device.";
    case error.TIMEOUT:
      return "Location request timed out. Please try again.";
    default:
      return "Unable to retrieve location from this device.";
  }
}

export function LocationTracker({
  tripId,
  tripStatus,
  operatorUserId,
}: LocationTrackerProps) {
  const [isTracking, setIsTracking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lastSentLocation, setLastSentLocation] = useState<{
    lat: number;
    lng: number;
    timestamp: string;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const [currentPosition, setCurrentPosition] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
    heading: number | null;
    speed: number | null;
  } | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const endingRef = useRef(false);

  const isTripEnded = tripStatus === "completed" || tripStatus === "canceled";
  const isTripActive = ACTIVE_TRIP_STATUSES.has(tripStatus);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const clearGeolocationWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const stopTracking = useCallback(
    async (options?: { endSession?: boolean; preserveError?: boolean }) => {
      clearGeolocationWatch();
      setIsTracking(false);

      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId || options?.endSession === false || endingRef.current) {
        return;
      }

      endingRef.current = true;
      try {
        const response = await fetch("/api/tracking/session", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: activeSessionId }),
        });

        if (!response.ok && !options?.preserveError) {
          setLocationError("Unable to close tracking session cleanly.");
        }
      } catch {
        if (!options?.preserveError) {
          setLocationError("Unable to close tracking session cleanly.");
        }
      } finally {
        endingRef.current = false;
        sessionIdRef.current = null;
        setSessionId(null);
      }
    },
    [clearGeolocationWatch],
  );

  const sendLocationUpdate = useCallback(async (position: GeolocationPosition) => {
    const activeSessionId = sessionIdRef.current;
    if (!activeSessionId) return;

    const coords = position.coords;
    const payload = {
      sessionId: activeSessionId,
      location: {
        latitude: coords.latitude,
        longitude: coords.longitude,
        altitude: coords.altitude ?? null,
        heading: coords.heading ?? null,
        speed: coords.speed ?? null,
        accuracy: coords.accuracy ?? null,
        source: "gps" as const,
        recordedAt: new Date(position.timestamp).toISOString(),
      },
    };

    try {
      const response = await fetch("/api/tracking/location", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Location update failed.");
      }

      const body = (await response.json()) as RecordLocationResponse;
      if (!body.recorded) {
        if (body.reason && body.reason !== "Too frequent") {
          setLocationError(body.reason);
        }
        return;
      }

      setLastSentLocation({
        lat: coords.latitude,
        lng: coords.longitude,
        timestamp: new Date(position.timestamp).toISOString(),
      });
      setSendCount((count) => count + 1);
      setLocationError(null);
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Failed to send location update.";
      setLocationError(message);
    }
  }, []);

  const beginGeolocationWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location services not available on this device.");
      return false;
    }

    clearGeolocationWatch();

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = position.coords;
        setCurrentPosition({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null,
          heading: coords.heading ?? null,
          speed: coords.speed ?? null,
        });
        void sendLocationUpdate(position);
      },
      (error) => {
        setLocationError(geolocationErrorMessage(error));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 10000,
      },
    );

    watchIdRef.current = watchId;
    return true;
  }, [clearGeolocationWatch, sendLocationUpdate]);

  const startTracking = useCallback(async () => {
    setLocationError(null);

    if (isTripEnded) {
      setLocationError("Trip ended — tracking stopped.");
      return;
    }

    try {
      const response = await fetch("/api/tracking/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tripId }),
      });

      const body = (await response.json().catch(() => null)) as TrackingSessionResponse | null;

      if (!response.ok || !body?.session?.id) {
        throw new Error(body?.error ?? "Unable to start tracking session.");
      }

      sessionIdRef.current = body.session.id;
      setSessionId(body.session.id);
      setIsTracking(true);

      const watchStarted = beginGeolocationWatch();
      if (!watchStarted) {
        await stopTracking({ endSession: true, preserveError: true });
      }
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to start tracking.";
      setLocationError(message);
      setIsTracking(false);
    }
  }, [beginGeolocationWatch, isTripEnded, stopTracking, tripId]);

  useEffect(() => {
    if (isTripEnded) {
      void stopTracking({ endSession: true });
    }
  }, [isTripEnded, stopTracking]);

  useEffect(() => {
    if (!isTripActive || isTracking || isTripEnded) return;

    let cancelled = false;
    const restoreActiveSession = async () => {
      try {
        const response = await fetch(`/api/tracking/snapshot/${tripId}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) return;

        const body = (await response.json()) as { session?: { id?: string | null } | null };
        const existingSessionId = body.session?.id ?? null;
        if (!existingSessionId || cancelled) return;

        sessionIdRef.current = existingSessionId;
        setSessionId(existingSessionId);
        setIsTracking(true);

        const watchStarted = beginGeolocationWatch();
        if (!watchStarted) {
          await stopTracking({ endSession: true, preserveError: true });
        }
      } catch {
        // Session restoration is best-effort.
      }
    };

    void restoreActiveSession();
    return () => {
      cancelled = true;
    };
  }, [beginGeolocationWatch, isTracking, isTripActive, isTripEnded, stopTracking, tripId]);

  useEffect(() => {
    return () => {
      clearGeolocationWatch();
      if (sessionIdRef.current) {
        void fetch("/api/tracking/session", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        }).catch(() => null);
      }
    };
  }, [clearGeolocationWatch]);

  const speedMph = useMemo(() => {
    if (!currentPosition?.speed || currentPosition.speed <= 0) return null;
    return currentPosition.speed * 2.237;
  }, [currentPosition?.speed]);

  const headingCompass = headingToCompass(currentPosition?.heading);

  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[2px]" style={{ color: "#475569" }}>
          Live Location Sharing
        </p>
        <p className="text-[11px]" style={{ color: "#475569" }}>
          Operator {operatorUserId.slice(0, 8)}
        </p>
      </div>

      {isTracking ? (
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300" />
            </span>
            <p className="text-sm font-medium" style={{ color: "#86efac" }}>
              Tracking Active
            </p>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2" style={{ color: "#cbd5e1" }}>
            <p>
              <span style={{ color: "#64748b" }}>Coordinates:</span>{" "}
              {currentPosition
                ? `${currentPosition.latitude.toFixed(5)}, ${currentPosition.longitude.toFixed(5)}`
                : "Waiting for GPS..."}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Accuracy:</span>{" "}
              {currentPosition?.accuracy !== null && currentPosition?.accuracy !== undefined
                ? `${currentPosition.accuracy.toFixed(0)} m`
                : "—"}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Speed:</span>{" "}
              {speedMph ? `${speedMph.toFixed(1)} mph` : "—"}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Heading:</span>{" "}
              {headingCompass
                ? `${headingCompass}${currentPosition?.heading ? ` (${Math.round(currentPosition.heading)}°)` : ""}`
                : "—"}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Updates sent:</span> {sendCount}
            </p>
            <p>
              <span style={{ color: "#64748b" }}>Last sent:</span>{" "}
              {lastSentLocation ? formatRelativeTime(lastSentLocation.timestamp) : "—"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void stopTracking({ endSession: true })}
            className="rounded-md px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-90"
            style={{ background: "rgba(239,68,68,0.18)", color: "#fda4af" }}
          >
            Stop Location Sharing
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {isTripEnded ? (
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Trip ended — tracking stopped.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => void startTracking()}
              className="rounded-md px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: "rgba(34,197,94,0.2)", color: "#86efac" }}
            >
              Start Location Sharing
            </button>
          )}
        </div>
      )}

      {locationError && (
        <div className="mt-3 rounded-md border px-3 py-2 text-xs" style={{ borderColor: "rgba(248,113,113,0.3)", color: "#fda4af" }}>
          <p>{locationError}</p>
          {!isTracking && !isTripEnded && (
            <button
              type="button"
              onClick={() => void startTracking()}
              className="mt-2 rounded px-2 py-1 font-medium"
              style={{ background: "rgba(248,113,113,0.15)", color: "#fecaca" }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
