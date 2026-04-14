import * as Location from "expo-location";
import { apiClient } from "@/lib/api";

export async function requestLocationPermission(): Promise<boolean> {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === "granted";
}

type TrackableLocation = {
  coords: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    heading?: number | null;
    speed?: number | null;
    accuracy?: number | null;
  };
};

export function startLocationTracking(
  tripId: string,
  token: string,
  onLocation?: (loc: TrackableLocation) => void,
): { stop: () => void } {
  let subscription: Location.LocationSubscription | null = null;
  let isStopped = false;

  void (async () => {
    const nextSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        distanceInterval: 50,
        timeInterval: 15000,
      },
      async (location) => {
        if (isStopped) {
          return;
        }

        onLocation?.(location);

        try {
          await apiClient(`trips/${tripId}/location`, {
            method: "POST",
            token,
            body: {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              altitude: location.coords.altitude ?? undefined,
              heading: location.coords.heading ?? undefined,
              speed: location.coords.speed ?? undefined,
              accuracy: location.coords.accuracy ?? undefined,
            },
          });
        } catch {
        }
      },
    );

    if (isStopped) {
      nextSubscription.remove();
      return;
    }

    subscription = nextSubscription;
  })();

  return {
    stop: () => {
      isStopped = true;
      subscription?.remove();
      subscription = null;
    },
  };
}
