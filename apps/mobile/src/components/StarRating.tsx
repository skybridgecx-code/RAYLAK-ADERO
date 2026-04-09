import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";
import { colors, spacing } from "@/lib/theme";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: number;
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 26,
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={{ flexDirection: "row", gap: spacing.xs }}>
      {stars.map((star) => {
        const filled = star <= value;
        const icon = filled ? "star" : "star-outline";
        const color = filled ? colors.warning : colors.textMuted;
        if (readonly || onChange === undefined) {
          return (
            <View key={star}>
              <Ionicons name={icon} size={size} color={color} />
            </View>
          );
        }
        return (
          <Pressable key={star} onPress={() => onChange(star)} hitSlop={8}>
            <Ionicons name={icon} size={size} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
}
