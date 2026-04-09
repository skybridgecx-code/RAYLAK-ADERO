import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { colors, fontSize, spacing } from "@/lib/theme";

export default function TripDetailPlaceholderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
      <Card>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Trip Detail</Text>
        <Text style={{ color: colors.textSecondary }}>Trip ID: {params.id ?? "Unknown"}</Text>
        <Text style={{ color: colors.textMuted }}>Detailed trip tracking and controls will be added in the next phase.</Text>
        <Button title="Back to Trips" onPress={() => router.back()} variant="secondary" />
      </Card>
    </SafeAreaView>
  );
}
