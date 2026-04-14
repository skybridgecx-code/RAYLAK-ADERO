"use client";

import { useCallback, useEffect, useState } from "react";

export type TrackingSnapshotData = {
  tripId: string;
  tripStatus: string | null;
  location: {
    id: string;
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
    source: string;
    recordedAt: string;
  } | null;
  eta: {
    id: string;
    status: string;
    estimatedArrivalAt: string | null;
    estimatedDurationMinutes: number | null;
    estimatedDistanceMiles: number | null;
    distanceRemainingMiles: number | null;
    destinationType: string;
    currentLatitude: number | null;
    currentLongitude: number | null;
    destinationLatitude: number | null;
    destinationLongitude: number | null;
  } | null;
  session: {
    id: string;
    isActive: boolean;
    locationCount: number;
    totalDistanceMiles: number;
    startedAt: string;
  } | null;
  geofenceEvents: Array<{
    id: string;
    eventType: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    triggeredAt: string;
  }>;
  locationHistory: Array<{
    id: string;
    latitude: number;
    longitude: number;
    recordedAt: string;
    heading: number | null;
    speed: number | null;
    accuracy: number | null;
  }>;
  isStale: boolean;
  timestamp: string;
};

export function useTrackingSnapshot(tripId: string | null): {
  snapshot: TrackingSnapshotData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [snapshot, setSnapshot] = useState<TrackingSnapshotData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!tripId) {
      setSnapshot(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/tracking/snapshot/${tripId}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Failed to fetch tracking snapshot.");
      }

      const data = (await response.json()) as TrackingSnapshotData;
      setSnapshot(data);
    } catch (fetchError) {
      const message =
        fetchError instanceof Error && fetchError.message.trim().length > 0
          ? fetchError.message
          : "Failed to fetch tracking snapshot.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { snapshot, isLoading, error, refetch };
}
