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

type DisputeRecord = {
  id: string;
  tripId: string;
  filedByUserId: string;
  filedAgainstUserId?: string | null;
  category: string;
  priority: string;
  subject: string;
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

function getPriorityColors(priority: string) {
  if (priority === "urgent") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (priority === "high") {
    return { color: "#fb923c", bgColor: "rgba(251,146,60,0.18)" };
  }
  if (priority === "medium") {
    return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

function getStatusColors(status: string) {
  if (status === "resolved") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "open") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  if (status === "under_review") {
    return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
  }
  if (status === "escalated") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

function getCategoryColors() {
  return { color: colors.primary, bgColor: colors.primaryBg };
}

export default function DisputesScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAderoAuth();
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDisputes = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!isSignedIn) {
      setDisputes([]);
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
      const data = await apiClient<DisputeRecord[]>("disputes", { token });
      setDisputes(data);
    } catch {
      setDisputes([]);
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
    void loadDisputes();
  }, [isLoaded, loadDisputes]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={disputes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1, paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md }}>
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Disputes</Text>
            <Button title="File Dispute" variant="secondary" onPress={() => router.push("/(main)/dispute/new")} />
          </View>
        }
        ListEmptyComponent={
          <Card>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>No disputes filed.</Text>
          </Card>
        }
        onRefresh={() => {
          void loadDisputes("refresh");
        }}
        refreshing={isRefreshing}
        renderItem={({ item }) => {
          const categoryBadge = getCategoryColors();
          const priorityBadge = getPriorityColors(item.priority);
          const statusBadge = getStatusColors(item.status);
          return (
            <Pressable onPress={() => router.push(`/(main)/dispute/${item.id}`)}>
              <Card>
                <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "700" }}>
                  {truncate(item.subject, 50)}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                  <StatusBadge label={item.category.replaceAll("_", " ")} color={categoryBadge.color} bgColor={categoryBadge.bgColor} />
                  <StatusBadge label={item.priority} color={priorityBadge.color} bgColor={priorityBadge.bgColor} />
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
