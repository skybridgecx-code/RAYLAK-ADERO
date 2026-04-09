import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type IncidentRecord = {
  id: string;
  tripId?: string | null;
  reportedByUserId: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
};

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 1)}…`;
}

function getSeverityColors(severity: string) {
  if (severity === "critical") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (severity === "high") {
    return { color: "#fb923c", bgColor: "rgba(251,146,60,0.18)" };
  }
  if (severity === "medium") {
    return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

function getIncidentStatusColors(status: string) {
  if (status === "reported") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  if (status === "action_taken" || status === "resolved" || status === "closed") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "investigating") {
    return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

export default function IncidentsScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAderoAuth();
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadIncidents = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!isSignedIn) {
      setIncidents([]);
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
      const data = await apiClient<IncidentRecord[]>("incidents", { token });
      setIncidents(data);
    } catch {
      setIncidents([]);
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
    void loadIncidents();
  }, [isLoaded, loadIncidents]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Incidents</Text>
            <Button title="Report Incident" variant="secondary" onPress={() => router.push("/(main)/incident/new")} />
          </View>
        }
        ListEmptyComponent={
          <Card>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>No incidents reported.</Text>
          </Card>
        }
        onRefresh={() => {
          void loadIncidents("refresh");
        }}
        refreshing={isRefreshing}
        renderItem={({ item }) => {
          const severityBadge = getSeverityColors(item.severity);
          const statusBadge = getIncidentStatusColors(item.status);
          return (
            <Pressable onPress={() => router.push(`/(main)/incident/${item.id}`)}>
              <Card>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "700" }}>
                  {truncate(item.title, 50)}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                  <StatusBadge label={item.severity} color={severityBadge.color} bgColor={severityBadge.bgColor} />
                  <StatusBadge label={item.category.replaceAll("_", " ")} color={colors.primary} bgColor={colors.primaryBg} />
                  <StatusBadge label={item.status.replaceAll("_", " ")} color={statusBadge.color} bgColor={statusBadge.bgColor} />
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  Created {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
