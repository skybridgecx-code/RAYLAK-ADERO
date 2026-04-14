import { Text, View } from "react-native";
import { borderRadius, fontSize, spacing } from "@/lib/theme";

type StatusBadgeProps = {
  label: string;
  color: string;
  bgColor: string;
};

export function StatusBadge({ label, color, bgColor }: StatusBadgeProps) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bgColor,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
      }}
    >
      <Text style={{ color, fontSize: fontSize.xs, fontWeight: "600", textTransform: "uppercase" }}>
        {label}
      </Text>
    </View>
  );
}
