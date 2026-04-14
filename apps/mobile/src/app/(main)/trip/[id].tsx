import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type TripRecord = {
  id: string;
  requestId: string;
  operatorId: string;
  status: string;
  scheduledAt?: string | null;
  createdAt?: string;
};

type LocationRecord = {
  latitude: string | number;
  longitude: string | number;
  heading?: string | number | null;
  speed?: string | number | null;
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

type RequestRecord = {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: string;
};

type RatingRecord = {
  id: string;
  raterRole?: string;
};

function getStatusColors(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (normalized === "canceled") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (normalized.includes("in_progress") || normalized.includes("route") || normalized.includes("arrived")) {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

function asNumber(value: string | number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getPickupPlaceholderCoordinate(
  location: LocationRecord | null,
): { latitude: number; longitude: number } {
  if (location) {
    return {
      latitude: asNumber(location.latitude) + 0.01,
      longitude: asNumber(location.longitude) + 0.01,
    };
  }
  return { latitude: 37.7749, longitude: -122.4194 };
}

export default function TripDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { getToken, isLoaded } = useAderoAuth();
  const tripId = params.id ?? "";

  const [tripPayload, setTripPayload] = useState<TripDetailPayload | null>(null);
  const [requestDetails, setRequestDetails] = useState<RequestRecord | null>(null);
  const [hasRated, setHasRated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!tripId) {
      setError("Invalid trip id.");
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const detail = await apiClient<TripDetailPayload>(`trips/${tripId}`, { token });
      const [request, ratings] = await Promise.all([
        apiClient<RequestRecord>(`requests/${detail.trip.requestId}`, { token }).catch(() => null),
        apiClient<RatingRecord[]>(`trips/${tripId}/rate`, { token }).catch(() => []),
      ]);

      setTripPayload(detail);
      setRequestDetails(request);
      setHasRated(ratings.some((rating) => rating.raterRole === "requester"));
      setError(null);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load trip.";
      setError(message);
      setTripPayload(null);
      setRequestDetails(null);
      setHasRated(false);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, tripId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadData();
  }, [isLoaded, loadData]);

  useEffect(() => {
    if (!isLoaded || !tripId) {
      return;
    }
    const interval = setInterval(() => {
      void loadData();
    }, 10000);
    return () => clearInterval(interval);
  }, [isLoaded, loadData, tripId]);

  const cancelTrip = async () => {
    if (!tripPayload) {
      return;
    }
    setIsActionLoading(true);
    try {
      const token = await getToken();
      await apiClient(`trips/${tripPayload.trip.id}/cancel`, {
        method: "POST",
        token,
        body: { reason: "Canceled by requester from mobile app" },
      });
      Alert.alert("Trip canceled", "Your trip has been canceled.");
      await loadData();
    } catch (cancelError) {
      const message = cancelError instanceof Error ? cancelError.message : "Failed to cancel trip.";
      Alert.alert("Cancel trip failed", message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const status = tripPayload?.trip.status ?? "unknown";
  const statusColors = getStatusColors(status);
  const canCancel = status === "in_progress";
  const canRate = status === "completed" && !hasRated;
  const operatorLocation = tripPayload?.location ?? null;
  const pickupCoordinate = getPickupPlaceholderCoordinate(operatorLocation);
  const mapRegion = useMemo(() => {
    if (operatorLocation) {
      return {
        latitude: asNumber(operatorLocation.latitude),
        longitude: asNumber(operatorLocation.longitude),
        latitudeDelta: 0.07,
        longitudeDelta: 0.07,
      };
    }
    return {
      latitude: pickupCoordinate.latitude,
      longitude: pickupCoordinate.longitude,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };
  }, [operatorLocation, pickupCoordinate.latitude, pickupCoordinate.longitude]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!tripPayload || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error }}>{error ?? "Trip not found."}</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <ScrollView contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.xxl }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Trip Detail</Text>

        <MapView
          style={{ height: 300, borderRadius: 16 }}
          initialRegion={mapRegion}
          region={mapRegion}
        >
          {operatorLocation ? (
            <Marker
              coordinate={{
                latitude: asNumber(operatorLocation.latitude),
                longitude: asNumber(operatorLocation.longitude),
              }}
              title="Operator"
            />
          ) : null}
          <Marker coordinate={pickupCoordinate} title="Pickup" pinColor="#818cf8" />
        </MapView>

        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
              Trip Information
            </Text>
            <StatusBadge
              label={status.replaceAll("_", " ")}
              color={statusColors.color}
              bgColor={statusColors.bgColor}
            />
          </View>
          <Text style={{ color: colors.textSecondary }}>
            Operator ID: {tripPayload.trip.operatorId}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Pickup: {requestDetails?.pickupAddress ?? "Unavailable"}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Dropoff: {requestDetails?.dropoffAddress ?? "Unavailable"}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Scheduled:{" "}
            {tripPayload.trip.scheduledAt
              ? new Date(tripPayload.trip.scheduledAt).toLocaleString()
              : requestDetails?.pickupAt
                ? new Date(requestDetails.pickupAt).toLocaleString()
                : "Unavailable"}
          </Text>
        </Card>

        {tripPayload.eta ? (
          <Card style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
              ETA
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              Arriving in {tripPayload.eta.estimatedDurationMinutes ?? "—"} minutes
            </Text>
            <Text style={{ color: colors.textSecondary }}>
              {Number(tripPayload.eta.distanceRemainingMiles ?? 0).toFixed(1)} miles remaining
            </Text>
          </Card>
        ) : null}

        <Card style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
            Status Timeline
          </Text>
          {tripPayload.statusLog.length === 0 ? (
            <Text style={{ color: colors.textSecondary }}>No status updates yet.</Text>
          ) : (
            tripPayload.statusLog.map((entry) => (
              <View key={entry.id} style={{ gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {entry.fromStatus.replaceAll("_", " ")} {"->"} {entry.toStatus.replaceAll("_", " ")}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
                {entry.note ? (
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>{entry.note}</Text>
                ) : null}
              </View>
            ))
          )}
        </Card>

        {canCancel ? (
          <Button
            title="Cancel Trip"
            variant="danger"
            loading={isActionLoading}
            onPress={() => {
              void cancelTrip();
            }}
          />
        ) : null}

        {canRate ? (
          <Button
            title="Rate Trip"
            variant="secondary"
            onPress={() => router.push(`/(main)/trip/${tripPayload.trip.id}/rate`)}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
