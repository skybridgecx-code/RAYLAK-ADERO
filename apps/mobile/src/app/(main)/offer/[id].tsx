import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ServiceTypeBadge } from "@/components/ServiceTypeBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type OfferRecord = {
  id: string;
  requestId: string;
  operatorId: string;
  status: string;
  offeredAt?: string | null;
  respondedAt?: string | null;
};

type RequestRecord = {
  id: string;
  serviceType: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: string;
  passengerCount: number;
  vehiclePreference?: string | null;
  notes?: string | null;
  status: string;
};

type OfferDetailPayload = {
  offer: OfferRecord;
  request: RequestRecord;
};

type OfferActionResponse =
  | {
      action: "accept";
      tripId: string;
    }
  | {
      action: "decline";
      offer: OfferRecord;
    };

function getOfferStatusColors(status: string) {
  if (status === "accepted") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "declined") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (status === "expired") {
    return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
  }
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

export default function OfferDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const offerId = params.id ?? "";
  const { getToken, isLoaded } = useAderoAuth();
  const [payload, setPayload] = useState<OfferDetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOffer = useCallback(async () => {
    if (!offerId) {
      setError("Invalid offer id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const data = await apiClient<OfferDetailPayload>(`offers/${offerId}`, { token });
      setPayload(data);
      setError(null);
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load offer.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, offerId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadOffer();
  }, [isLoaded, loadOffer]);

  const acceptOffer = async () => {
    if (!payload) {
      return;
    }

    setIsActing(true);
    try {
      const token = await getToken();
      const response = await apiClient<OfferActionResponse>(`offers/${payload.offer.id}`, {
        method: "POST",
        token,
        body: { action: "accept" },
      });

      if (response.action === "accept") {
        Alert.alert("Offer accepted! Trip created.");
        router.replace(`/(main)/operator-trip/${response.tripId}`);
      }
    } catch (actionError) {
      Alert.alert(
        "Unable to accept offer",
        actionError instanceof Error ? actionError.message : "Please try again.",
      );
    } finally {
      setIsActing(false);
    }
  };

  const declineOffer = async () => {
    if (!payload) {
      return;
    }

    Alert.alert("Decline Offer", "Are you sure you want to decline this offer?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setIsActing(true);
            try {
              const token = await getToken();
              await apiClient<OfferActionResponse>(`offers/${payload.offer.id}`, {
                method: "POST",
                token,
                body: { action: "decline" },
              });
              router.replace("/(main)/offers");
            } catch (actionError) {
              Alert.alert(
                "Unable to decline offer",
                actionError instanceof Error ? actionError.message : "Please try again.",
              );
            } finally {
              setIsActing(false);
            }
          })();
        },
      },
    ]);
  };

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!payload || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error, fontSize: fontSize.md }}>
              {error ?? "Offer not found."}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const statusColors = getOfferStatusColors(payload.offer.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
          Offer Detail
        </Text>
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
            <ServiceTypeBadge serviceType={payload.request.serviceType} />
            <StatusBadge
              label={payload.offer.status.replaceAll("_", " ")}
              color={statusColors.color}
              bgColor={statusColors.bgColor}
            />
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
            {payload.request.pickupAddress}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Dropoff: {payload.request.dropoffAddress}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Pickup: {new Date(payload.request.pickupAt).toLocaleString()}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Passengers: {payload.request.passengerCount}
          </Text>
          {payload.request.vehiclePreference ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Vehicle preference: {payload.request.vehiclePreference}
            </Text>
          ) : null}
          {payload.request.notes ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              Notes: {payload.request.notes}
            </Text>
          ) : null}
        </Card>

        {payload.offer.status === "pending" ? (
          <>
            <Button
              title="Accept Offer"
              loading={isActing}
              onPress={() => {
                void acceptOffer();
              }}
            />
            <Button
              title="Decline Offer"
              variant="danger"
              loading={isActing}
              onPress={() => {
                void declineOffer();
              }}
            />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
