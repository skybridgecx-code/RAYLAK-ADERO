import { ActivityIndicator, Text, View } from "react-native";
import { colors, fontSize, spacing } from "@/lib/theme";

export function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.lg,
      }}
    >
      <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
        Adero
      </Text>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>
        Loading
      </Text>
    </View>
  );
}
