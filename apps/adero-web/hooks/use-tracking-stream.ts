"use client";

import { useEffect, useState } from "react";

export type TrackingStreamPayload = {
  type: "tracking_update" | "trip_ended" | "error";
  tripId: string;
  tripStatus?: string;
  location?: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
    recordedAt: string;
  } | null;
  eta?: {
    status: string;
    estimatedArrivalAt: string | null;
    estimatedDurationMinutes: number | null;
    distanceRemainingMiles: number | null;
    destinationType: string;
  } | null;
  session?: {
    isActive: boolean;
    locationCount: number;
    totalDistanceMiles: number;
  } | null;
  isStale?: boolean;
  message?: string;
  timestamp: string;
};

export function useTrackingStream(tripId: string | null): {
  trackingData: TrackingStreamPayload | null;
  isConnected: boolean;
  error: string | null;
} {
  const [trackingData, setTrackingData] = useState<TrackingStreamPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTrackingData(null);
      setIsConnected(false);
      setError(null);
      return;
    }

    const eventSource = new EventSource(`/api/tracking/stream/${tripId}`);

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TrackingStreamPayload;
        setTrackingData(payload);

        if (payload.type === "error") {
          setError(payload.message ?? "Tracking stream error.");
          setIsConnected(false);
          eventSource.close();
          return;
        }

        if (payload.type === "trip_ended") {
          setIsConnected(false);
          eventSource.close();
        }
      } catch {
        setError("Failed to parse tracking stream payload.");
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
      setError("Tracking stream disconnected.");
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setIsConnected(false);
    };
  }, [tripId]);

  return { trackingData, isConnected, error };
}
