import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { requestLocationPermission, startLocationTracking } from "@/lib/location";
import { colors, fontSize, spacing } from "@/lib/theme";

type TripRecord = {
  id: string;
  requestId: string;
  operatorId: string;
  status: string;
  scheduledAt?: string | null;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
  pickupLatitude?: string | number | null;
  pickupLongitude?: string | number | null;
  passengerCount?: number | null;
};

type LocationRecord = {
  latitude: string | number;
  longitude: string | number;
  altitude?: string | number | null;
  heading?: string | number | null;
  speed?: string | number | null;
  accuracy?: string | number | null;
  recordedAt?: string | Date | null;
};

type EtaRecord = {
  status: string;
  estimatedDurationMinutes?: number | null;
  distanceRemainingMiles?: string | number | null;
  estimatedArrivalAt?: string | Date | null;
};

type StatusLogItem = {
  id: string;
  fromStatus: string;
  toStatus: string;
  note?: string | null;
  createdAt: string;
};

type TripDetailPayload = {
  trip: TripRecord;
  location: LocationRecord | null;
  eta: EtaRecord | null;
  statusLog: StatusLogItem[];
};

type TrackerHandle = {
  stop: () => void;
};

function getStatusColors(status: string) {
  if (status === "completed") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "operator_en_route" || status === "operator_arrived" || status === "in_progress") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

function asNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getNextStatusAction(status: string) {
  if (status === "assigned") {
    return { title: "Start Route", nextStatus: "operator_en_route" as const };
  }
  if (status === "operator_en_route") {
    return { title: "Arrived at Pickup", nextStatus: "operator_arrived" as const };
  }
  if (status === "operator_arrived") {
    return { title: "Start Trip", nextStatus: "in_progress" as const };
  }
  if (status === "in_progress") {
    return { title: "Complete Trip", nextStatus: "completed" as const };
  }
  return null;
}

export default function OperatorTripScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const tripId = params.id ?? "";
  const { getToken, isLoaded } = useAderoAuth();
  const [tripPayload, setTripPayload] = useState<TripDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationRecord | null>(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const trackingRef = useRef<TrackerHandle | null>(null);

  const loadTrip = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!tripId) {
      setError("Invalid trip id.");
      setIsLoading(false);
      return;
    }

    if (mode === "initial") {
      setIsLoading(true);
    }

    try {
      const token = await getToken();
      const detail = await apiClient<TripDetailPayload>(`trips/${tripId}`, { token });
      setTripPayload(detail);
      setCurrentLocation((previous) => previous ?? detail.location);
      setError(null);
    } catch (loadError) {
      setTripPayload(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load trip.");
    } finally {
      if (mode === "initial") {
        setIsLoading(false);
      }
    }
  }, [getToken, tripId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadTrip();
  }, [isLoaded, loadTrip]);

  useEffect(() => {
    if (!isLoaded || !tripId) {
      return;
    }

    const interval = setInterval(() => {
      void loadTrip("refresh");
    }, 10000);

    return () => clearInterval(interval);
  }, [isLoaded, loadTrip, tripId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    void (async () => {
      const granted = await requestLocationPermission();
      setHasLocationPermission(granted);
    })();
  }, [isLoaded]);

  useEffect(() => {
    const isTrackingStatus =
      tripPayload?.trip.status === "operator_en_route" || tripPayload?.trip.status === "in_progress";

    if (!isTrackingStatus || !hasLocationPermission || !tripId) {
      trackingRef.current?.stop();
      trackingRef.current = null;
      setIsGpsActive(false);
      return;
    }

    let isMounted = true;

    void (async () => {
      const token = await getToken();
      if (!isMounted) {
        return;
      }

      trackingRef.current?.stop();
      trackingRef.current = startLocationTracking(tripId, token ?? "", (location) => {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude ?? null,
          heading: location.coords.heading ?? null,
          speed: location.coords.speed ?? null,
          accuracy: location.coords.accuracy ?? null,
          recordedAt: new Date().toISOString(),
        });
      });
      setIsGpsActive(true);
    })();

    return () => {
      isMounted = false;
      trackingRef.current?.stop();
      trackingRef.current = null;
      setIsGpsActive(false);
    };
  }, [getToken, hasLocationPermission, tripId, tripPayload?.trip.status]);

  const updateStatus = async (
    status: "operator_en_route" | "operator_arrived" | "in_progress" | "completed",
  ) => {
    if (!tripPayload) {
      return;
    }

    setIsUpdatingStatus(true);
    try {
      const token = await getToken();
      await apiClient(`trips/${tripPayload.trip.id}/status`, {
        method: "POST",
        token,
        body: { status },
      });
      await loadTrip("refresh");
    } catch (updateError) {
      Alert.alert(
        "Unable to update trip",
        updateError instanceof Error ? updateError.message : "Please try again.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const tripStatus = tripPayload?.trip.status ?? "";
  const statusAction = getNextStatusAction(tripStatus);
  const statusColors = getStatusColors(tripStatus);
  const operatorLocation = currentLocation ?? tripPayload?.location ?? null;
  const pickupLatitude = asNumber(tripPayload?.trip.pickupLatitude);
  const pickupLongitude = asNumber(tripPayload?.trip.pickupLongitude);
  const pickupCoordinate =
    pickupLatitude !== null && pickupLongitude !== null
      ? { latitude: pickupLatitude, longitude: pickupLongitude }
      : null;

  const mapRegion = useMemo(() => {
    if (operatorLocation) {
      const latitude = asNumber(operatorLocation.latitude) ?? 37.7749;
      const longitude = asNumber(operatorLocation.longitude) ?? -122.4194;
      return {
        latitude,
        longitude,
        latitudeDelta: 0.07,
        longitudeDelta: 0.07,
      };
    }

    if (pickupCoordinate) {
      return {
        latitude: pickupCoordinate.latitude,
        longitude: pickupCoordinate.longitude,
        latitudeDelta: 0.07,
        longitudeDelta: 0.07,
      };
    }

    return {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [operatorLocation, pickupCoordinate]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!tripPayload || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error, fontSize: fontSize.md }}>
              {error ?? "Trip not found."}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
          Operator Trip
        </Text>

        <MapView style={{ height: 280, borderRadius: 16 }} region={mapRegion}>
          {operatorLocation ? (
            <Marker
              coordinate={{
                latitude: asNumber(operatorLocation.latitude) ?? mapRegion.latitude,
                longitude: asNumber(operatorLocation.longitude) ?? mapRegion.longitude,
              }}
              title="Your location"
              pinColor="#60a5fa"
            />
          ) : null}
          {pickupCoordinate ? (
            <Marker coordinate={pickupCoordinate} title="Pickup" pinColor={colors.primary} />
          ) : null}
        </MapView>

        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
              Trip Info
            </Text>
            <StatusBadge
              label={tripPayload.trip.status.replaceAll("_", " ")}
              color={statusColors.color}
              bgColor={statusColors.bgColor}
            />
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Pickup: {tripPayload.trip.pickupAddress ?? "Unavailable"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Dropoff: {tripPayload.trip.dropoffAddress ?? "Unavailable"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Scheduled: {tripPayload.trip.scheduledAt ? new Date(tripPayload.trip.scheduledAt).toLocaleString() : "Unavailable"}
          </Text>
          {typeof tripPayload.trip.passengerCount === "number" ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Passengers: {tripPayload.trip.passengerCount}
            </Text>
          ) : null}
          {isGpsActive ? (
            <Text style={{ color: colors.success, fontSize: fontSize.sm, fontWeight: "600" }}>
              GPS Active
            </Text>
          ) : null}
        </Card>

        {tripPayload.eta ? (
          <Card style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
              ETA
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {tripPayload.eta.estimatedDurationMinutes ?? "—"} minutes remaining
            </Text>
            {tripPayload.eta.distanceRemainingMiles !== undefined && tripPayload.eta.distanceRemainingMiles !== null ? (
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                {Number(tripPayload.eta.distanceRemainingMiles).toFixed(1)} miles remaining
              </Text>
            ) : null}
            {tripPayload.eta.estimatedArrivalAt ? (
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                ETA: {new Date(tripPayload.eta.estimatedArrivalAt).toLocaleString()}
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
            Status Timeline
          </Text>
          {tripPayload.statusLog.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              No status updates yet.
            </Text>
          ) : (
            tripPayload.statusLog.map((entry) => (
              <View key={entry.id} style={{ gap: spacing.xs }}>
                <Text style={{ color: colors.text, fontSize: fontSize.sm, fontWeight: "600" }}>
                  {entry.toStatus.replaceAll("_", " ")}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
                {entry.note ? (
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {entry.note}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </Card>

        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
            Actions
          </Text>
          {statusAction ? (
            <Button
              title={statusAction.title}
              loading={isUpdatingStatus}
              onPress={() => {
                if (statusAction.nextStatus === "completed") {
                  Alert.alert("Complete Trip", "Are you sure you want to complete this trip?", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Complete",
                      onPress: () => {
                        void updateStatus("completed");
                      },
                    },
                  ]);
                  return;
                }
                void updateStatus(statusAction.nextStatus);
              }}
            />
          ) : null}
          {tripPayload.trip.status === "completed" ? (
            <>
              <Text style={{ color: colors.success, fontSize: fontSize.md, fontWeight: "600" }}>
                Trip Completed ✓
              </Text>
              <Button
                title="Rate Passenger"
                variant="secondary"
                onPress={() => router.push(`/(main)/trip/${tripPayload.trip.id}/rate`)}
              />
            </>
          ) : null}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
