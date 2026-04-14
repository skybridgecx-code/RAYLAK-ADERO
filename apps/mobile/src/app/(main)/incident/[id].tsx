import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  location?: string | null;
  createdAt: string;
};

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

function getStatusColors(status: string) {
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

export default function IncidentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const incidentId = params.id ?? "";
  const { getToken, isLoaded, isSignedIn } = useAderoAuth();
  const [incident, setIncident] = useState<IncidentRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadIncident = useCallback(async () => {
    if (!incidentId) {
      setError("Invalid incident id.");
      setIsLoading(false);
      return;
    }

    if (!isSignedIn) {
      setIncident(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const incidents = await apiClient<IncidentRecord[]>("incidents", { token });
      const match = incidents.find((item) => item.id === incidentId) ?? null;
      setIncident(match);
      setError(match ? null : "Incident not found.");
    } catch (loadError) {
      setIncident(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load incident.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, incidentId, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadIncident();
  }, [isLoaded, loadIncident]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!incident || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error, fontSize: fontSize.md }}>
              {error ?? "Incident not found."}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const severityBadge = getSeverityColors(incident.severity);
  const statusBadge = getStatusColors(incident.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
            {incident.title}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
            <StatusBadge label={incident.severity} color={severityBadge.color} bgColor={severityBadge.bgColor} />
            <StatusBadge label={incident.category.replaceAll("_", " ")} color={colors.primary} bgColor={colors.primaryBg} />
            <StatusBadge label={incident.status.replaceAll("_", " ")} color={statusBadge.color} bgColor={statusBadge.bgColor} />
          </View>
          <Text style={{ color: colors.text, fontSize: fontSize.md }}>{incident.description}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Location: {incident.location ?? "Unavailable"}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Date: {new Date(incident.createdAt).toLocaleString()}
          </Text>
        </Card>
      </View>
    </SafeAreaView>
  );
}
