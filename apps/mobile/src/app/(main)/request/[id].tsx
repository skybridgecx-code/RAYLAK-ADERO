import { useCallback, useEffect, useMemo, useState } from "react";
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

type RequestRecord = {
  id: string;
  serviceType: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: string;
  passengerCount: number;
  vehiclePreference: string | null;
  notes: string | null;
  status: string;
};

type QuoteRecord = {
  id: string;
  status: string;
  baseFare: string | number;
  distanceCharge: string | number;
  timeCharge: string | number;
  surgeCharge: string | number;
  tolls: string | number;
  gratuity: string | number;
  discount: string | number;
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  currency?: string;
};

type QuotePayload = {
  request: { id: string; requesterId: string };
  latestQuote: QuoteRecord | null;
  quotes: QuoteRecord[];
};

type TripRecord = {
  id: string;
  requestId: string;
};

type RequesterTripListItem = {
  trip: TripRecord;
  request: { id: string };
};

function toMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "$0.00";
  }
  return `$${amount.toFixed(2)}`;
}

function getStatusColors(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (normalized === "canceled" || normalized === "rejected") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (normalized === "matched" || normalized === "accepted" || normalized === "in_progress") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

export default function RequestDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const requestId = params.id ?? "";
  const { getToken, isLoaded } = useAderoAuth();

  const [requestRecord, setRequestRecord] = useState<RequestRecord | null>(null);
  const [quotePayload, setQuotePayload] = useState<QuotePayload | null>(null);
  const [linkedTripId, setLinkedTripId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRequest = useCallback(async () => {
    if (!requestId) {
      setError("Invalid request id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const [requestData, quoteData, trips] = await Promise.all([
        apiClient<RequestRecord>(`requests/${requestId}`, { token }),
        apiClient<QuotePayload>(`requests/${requestId}/quote`, { token }).catch(() => null),
        apiClient<Array<TripRecord | RequesterTripListItem>>("trips", { token }).catch(() => []),
      ]);

      setRequestRecord(requestData);
      setQuotePayload(quoteData);

      const matchedTrip = trips.find((item) => {
        if (typeof item === "object" && item !== null && "trip" in item) {
          return (item as RequesterTripListItem).trip.requestId === requestData.id;
        }
        return (item as TripRecord).requestId === requestData.id;
      });

      if (matchedTrip && "trip" in matchedTrip) {
        setLinkedTripId(matchedTrip.trip.id);
      } else if (matchedTrip) {
        setLinkedTripId((matchedTrip as TripRecord).id);
      } else {
        setLinkedTripId(null);
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load request.";
      setError(message);
      setRequestRecord(null);
      setQuotePayload(null);
      setLinkedTripId(null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, requestId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadRequest();
  }, [isLoaded, loadRequest]);

  const latestQuote = quotePayload?.latestQuote ?? null;
  const canManageQuote =
    latestQuote !== null
    && (latestQuote.status === "sent" || latestQuote.status === "draft");
  const canCancelRequest =
    requestRecord?.status === "submitted" || requestRecord?.status === "quoted";

  const showQuoteSection = useMemo(
    () => requestRecord?.status === "quoted" || latestQuote !== null,
    [latestQuote, requestRecord?.status],
  );

  const actOnQuote = async (action: "approve" | "reject") => {
    if (!requestRecord) {
      return;
    }
    setIsActionLoading(true);
    try {
      const token = await getToken();
      await apiClient(`requests/${requestRecord.id}/quote`, {
        method: "POST",
        token,
        body: { action },
      });
      Alert.alert(
        action === "approve" ? "Quote approved" : "Quote rejected",
        action === "approve"
          ? "Your quote has been approved."
          : "Your quote has been rejected.",
      );
      await loadRequest();
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Failed to update quote.";
      Alert.alert("Quote action failed", message);
    } finally {
      setIsActionLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!requestRecord) {
      return;
    }
    setIsActionLoading(true);
    try {
      const token = await getToken();
      await apiClient(`requests/${requestRecord.id}/cancel`, {
        method: "POST",
        token,
        body: { reason: "Canceled from mobile app" },
      });
      Alert.alert("Request canceled", "Your request has been canceled.");
      await loadRequest();
    } catch (cancelError) {
      const message =
        cancelError instanceof Error ? cancelError.message : "Failed to cancel request.";
      Alert.alert("Cancel request failed", message);
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!requestRecord || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error, fontSize: fontSize.md }}>
              {error ?? "Request not found."}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const requestStatusColors = getStatusColors(requestRecord.status);
  const quoteStatusColors = latestQuote ? getStatusColors(latestQuote.status) : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
          Request Detail
        </Text>
        <Card style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
            <ServiceTypeBadge serviceType={requestRecord.serviceType} />
            <StatusBadge
              label={requestRecord.status.replaceAll("_", " ")}
              color={requestStatusColors.color}
              bgColor={requestStatusColors.bgColor}
            />
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
            {requestRecord.pickupAddress}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            to {requestRecord.dropoffAddress}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Pickup: {new Date(requestRecord.pickupAt).toLocaleString()}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Passengers: {requestRecord.passengerCount}
          </Text>
          {requestRecord.vehiclePreference ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Vehicle: {requestRecord.vehiclePreference}
            </Text>
          ) : null}
          {requestRecord.notes ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
              {requestRecord.notes}
            </Text>
          ) : null}
        </Card>

        {showQuoteSection ? (
          <Card style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
              Quote
            </Text>
            {latestQuote ? (
              <>
                {quoteStatusColors ? (
                  <StatusBadge
                    label={latestQuote.status.replaceAll("_", " ")}
                    color={quoteStatusColors.color}
                    bgColor={quoteStatusColors.bgColor}
                  />
                ) : null}
                <Text style={{ color: colors.textSecondary }}>Base fare: {toMoney(latestQuote.baseFare)}</Text>
                <Text style={{ color: colors.textSecondary }}>Distance: {toMoney(latestQuote.distanceCharge)}</Text>
                <Text style={{ color: colors.textSecondary }}>Time: {toMoney(latestQuote.timeCharge)}</Text>
                <Text style={{ color: colors.textSecondary }}>Surge: {toMoney(latestQuote.surgeCharge)}</Text>
                <Text style={{ color: colors.textSecondary }}>Tolls: {toMoney(latestQuote.tolls)}</Text>
                <Text style={{ color: colors.textSecondary }}>Gratuity: {toMoney(latestQuote.gratuity)}</Text>
                <Text style={{ color: colors.textSecondary }}>Discount: -{toMoney(latestQuote.discount)}</Text>
                <Text style={{ color: colors.textSecondary }}>Subtotal: {toMoney(latestQuote.subtotal)}</Text>
                <Text style={{ color: colors.textSecondary }}>Tax: {toMoney(latestQuote.taxAmount)}</Text>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "700" }}>
                  Total: {toMoney(latestQuote.totalAmount)}
                </Text>
                {canManageQuote ? (
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <Button
                      title="Approve Quote"
                      variant="primary"
                      loading={isActionLoading}
                      onPress={() => {
                        void actOnQuote("approve");
                      }}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title="Reject Quote"
                      variant="danger"
                      loading={isActionLoading}
                      onPress={() => {
                        void actOnQuote("reject");
                      }}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : null}
              </>
            ) : (
              <Text style={{ color: colors.textSecondary }}>No quote available.</Text>
            )}
          </Card>
        ) : null}

        {linkedTripId ? (
          <Button
            title="View Trip"
            variant="secondary"
            onPress={() => router.push(`/(main)/trip/${linkedTripId}`)}
          />
        ) : requestRecord.status === "matched" ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>
              Trip assignment is in progress. Refresh in a moment.
            </Text>
          </Card>
        ) : null}

        {canCancelRequest ? (
          <Button
            title="Cancel Request"
            variant="danger"
            loading={isActionLoading}
            onPress={() => {
              void cancelRequest();
            }}
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
