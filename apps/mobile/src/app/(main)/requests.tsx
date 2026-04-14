import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  status: string;
};

function getStatusColors(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (normalized === "canceled") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (normalized === "matched" || normalized === "accepted" || normalized === "in_progress") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

export default function RequestsScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken } = useAderoAuth();
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRequests = useCallback(
    async (refreshing: boolean) => {
      if (!isSignedIn) {
        setIsLoading(false);
        return;
      }

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const token = await getToken();
        const data = await apiClient<RequestRecord[]>("requests", { token });
        setRequests(data);
      } catch {
        setRequests([]);
      } finally {
        if (refreshing) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [getToken, isSignedIn],
  );

  useEffect(() => {
    void loadRequests(false);
  }, [loadRequests]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (requests.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg }}>
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700", marginBottom: spacing.md }}>
            Requests
          </Text>
          <Card style={{ gap: spacing.md }}>
            <Text style={{ color: colors.textSecondary }}>No requests yet.</Text>
            <Button
              title="Create Request"
              onPress={() => router.push("/(main)/request/new")}
              variant="secondary"
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadRequests(true);
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700", marginBottom: spacing.md }}>
            Requests
          </Text>
        }
        renderItem={({ item }) => {
          const statusColors = getStatusColors(item.status);
          return (
            <Pressable onPress={() => router.push(`/(main)/request/${item.id}`)}>
              <Card style={{ gap: spacing.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                  <ServiceTypeBadge serviceType={item.serviceType} />
                  <StatusBadge
                    label={item.status.replaceAll("_", " ")}
                    color={statusColors.color}
                    bgColor={statusColors.bgColor}
                  />
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
                  {truncate(item.pickupAddress, 52)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  {new Date(item.pickupAt).toLocaleString()}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
