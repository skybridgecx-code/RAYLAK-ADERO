import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type MePayload = {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
  };
  trustScore?: {
    overallScore?: number | null;
  } | null;
  availabilityStatus?: "available" | "busy" | "offline";
};

type Offer = {
  id: string;
  status: string;
};

type TripRecord = {
  status: string;
};

type RequesterTripListItem = {
  trip: TripRecord;
};

export default function HomeScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken, user } = useAderoAuth();
  const [meData, setMeData] = useState<MePayload | null>(null);
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [activeTripsCount, setActiveTripsCount] = useState(0);
  const [availabilityStatus, setAvailabilityStatus] = useState<"available" | "busy" | "offline">("offline");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingAvailability, setIsUpdatingAvailability] = useState(false);

  const isOperator = useMemo(() => {
    const role = meData?.user?.role ?? user?.publicMetadata?.role;
    return role === "operator";
  }, [meData?.user?.role, user?.publicMetadata?.role]);

  const isRequester = useMemo(() => {
    const role = meData?.user?.role ?? user?.publicMetadata?.role;
    return role === "requester" || role === "company";
  }, [meData?.user?.role, user?.publicMetadata?.role]);

  useEffect(() => {
    const load = async () => {
      if (!isSignedIn) return;
      setIsLoading(true);
      try {
        const token = await getToken();
        const payload = await apiClient<MePayload>("me", { token });
        setMeData(payload);
        if (payload.availabilityStatus) {
          setAvailabilityStatus(payload.availabilityStatus);
        }

        if ((payload.user?.role ?? "") === "operator") {
          const offers = await apiClient<Offer[]>("offers", { token });
          setPendingOffersCount(offers.filter((offer) => offer.status === "pending").length);
        }

        if ((payload.user?.role ?? "") === "requester" || (payload.user?.role ?? "") === "company") {
          const trips = await apiClient<Array<TripRecord | RequesterTripListItem>>("trips", { token });
          const activeStatuses = new Set(["assigned", "operator_en_route", "operator_arrived", "in_progress"]);
          const count = trips.filter((item) => {
            if (typeof item === "object" && item !== null && "trip" in item) {
              return activeStatuses.has((item as RequesterTripListItem).trip.status);
            }
            return activeStatuses.has((item as TripRecord).status);
          }).length;
          setActiveTripsCount(count);
        }
      } catch {
        setMeData(null);
      } finally {
        setIsLoading(false);
      }
    };

    void load();
  }, [getToken, isSignedIn]);

  const updateAvailability = async (nextEnabled: boolean) => {
    if (!isOperator) return;

    setIsUpdatingAvailability(true);
    const nextStatus: "available" | "offline" = nextEnabled ? "available" : "offline";
    try {
      const token = await getToken();
      await apiClient("operator/availability", {
        method: "PUT",
        token,
        body: { status: nextStatus },
      });
      setAvailabilityStatus(nextStatus);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update availability.";
      Alert.alert("Availability update failed", message);
    } finally {
      setIsUpdatingAvailability(false);
    }
  };

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
            Welcome to Adero
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
            {meData?.user?.name || meData?.user?.email || user?.primaryEmailAddress?.emailAddress || "User"}
          </Text>
        </Card>

        {isRequester ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Requester Dashboard</Text>
            <Text style={{ color: colors.textSecondary }}>Active trips: {activeTripsCount}</Text>
            <Button
              title="New Request"
              onPress={() => router.push("/(main)/request/new")}
              variant="secondary"
            />
            <Button
              title="View Requests"
              onPress={() => router.push("/(main)/requests")}
              variant="ghost"
            />
            {activeTripsCount > 0 ? (
              <Button
                title="View Active Trips"
                onPress={() => router.push("/(main)/trips")}
                variant="secondary"
              />
            ) : null}
          </Card>
        ) : null}

        {isOperator ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Operator Dashboard</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary }}>
                Availability: {availabilityStatus === "available" ? "Available" : "Offline"}
              </Text>
              <Switch
                value={availabilityStatus === "available"}
                onValueChange={updateAvailability}
                disabled={isUpdatingAvailability}
                trackColor={{ false: "#475569", true: colors.primary }}
              />
            </View>
            <Text style={{ color: colors.textSecondary }}>Pending offers: {pendingOffersCount}</Text>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
