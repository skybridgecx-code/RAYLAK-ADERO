import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type Trip = {
  id: string;
  status: string;
  createdAt?: string;
  request?: {
    pickupAddress?: string;
    dropoffAddress?: string;
    pickupAt?: string;
  };
  pickupAddress?: string;
  dropoffAddress?: string;
  pickupAt?: string;
};

function getStatusColors(status: string) {
  const key = status.toLowerCase();
  if (key.includes("completed") || key.includes("paid")) return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  if (key.includes("cancel") || key.includes("failed")) return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  if (key.includes("progress") || key.includes("route") || key.includes("arrived")) return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

export default function TripsScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAderoAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTrips = async () => {
      if (!isSignedIn) return;

      setIsLoading(true);
      try {
        const token = await getToken();
        const data = await apiClient<Trip[]>("trips", { token });
        setTrips(data);
      } catch {
        setTrips([]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadTrips();
  }, [getToken, isSignedIn]);

  const hasTrips = useMemo(() => trips.length > 0, [trips.length]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Trips</Text>
        {!hasTrips ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No trips yet.</Text>
          </Card>
        ) : (
          trips.map((trip) => {
            const colorsForStatus = getStatusColors(trip.status);
            const pickup = trip.request?.pickupAddress ?? trip.pickupAddress ?? "Unknown pickup";
            const dropoff = trip.request?.dropoffAddress ?? trip.dropoffAddress ?? "Unknown dropoff";
            const dateValue = trip.request?.pickupAt ?? trip.pickupAt ?? trip.createdAt;
            return (
              <Pressable key={trip.id} onPress={() => router.push(`/(main)/trip/${trip.id}`)}>
                <Card>
                  <StatusBadge
                    label={trip.status.replaceAll("_", " ")}
                    color={colorsForStatus.color}
                    bgColor={colorsForStatus.bgColor}
                  />
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>{pickup}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>to {dropoff}</Text>
                  {dateValue ? (
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                      {new Date(dateValue).toLocaleString()}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
