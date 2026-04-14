import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  notes?: string | null;
  status: string;
};

type OfferListItem = {
  offer: OfferRecord;
  request: RequestRecord;
};

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

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

export default function OffersScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAderoAuth();
  const [offers, setOffers] = useState<OfferListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadOffers = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!isSignedIn) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const token = await getToken();
      const data = await apiClient<OfferListItem[]>("offers", { token });
      const sorted = [...data].sort((left, right) => {
        if (left.offer.status === "pending" && right.offer.status !== "pending") {
          return -1;
        }
        if (left.offer.status !== "pending" && right.offer.status === "pending") {
          return 1;
        }
        return new Date(right.offer.offeredAt ?? 0).getTime() - new Date(left.offer.offeredAt ?? 0).getTime();
      });
      setOffers(sorted);
    } catch {
      setOffers([]);
    } finally {
      if (mode === "refresh") {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadOffers();
  }, [isLoaded, loadOffers]);

  const emptyState = useMemo(
    () => (
      <Card>
        <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
          No offers yet. Make sure you&apos;re set to Available.
        </Text>
      </Card>
    ),
    [],
  );

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.offer.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        ListHeaderComponent={
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700", marginBottom: spacing.md }}>
            Offers
          </Text>
        }
        ListEmptyComponent={emptyState}
        onRefresh={() => {
          void loadOffers("refresh");
        }}
        refreshing={isRefreshing}
        renderItem={({ item }) => {
          const statusColors = getOfferStatusColors(item.offer.status);
          return (
            <Pressable onPress={() => router.push(`/(main)/offer/${item.offer.id}`)}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                  <ServiceTypeBadge serviceType={item.request.serviceType} />
                  <StatusBadge
                    label={item.offer.status.replaceAll("_", " ")}
                    color={statusColors.color}
                    bgColor={statusColors.bgColor}
                  />
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
                  {truncate(item.request.pickupAddress, 40)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  to {truncate(item.request.dropoffAddress, 40)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {new Date(item.request.pickupAt).toLocaleString()}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  Passengers: {item.request.passengerCount}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
