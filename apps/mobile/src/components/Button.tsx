import { ActivityIndicator, Pressable, Text, ViewStyle } from "react-native";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

const variantStyles: Record<ButtonVariant, { backgroundColor: string; borderColor: string; textColor: string }> = {
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    textColor: colors.text,
  },
  secondary: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.border,
    textColor: colors.text,
  },
  danger: {
    backgroundColor: "rgba(248,113,113,0.18)",
    borderColor: colors.error,
    textColor: colors.error,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    textColor: colors.textSecondary,
  },
};

export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  style,
}: ButtonProps) {
  const styles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={{
        minHeight: 46,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        opacity: isDisabled ? 0.6 : 1,
        ...(style ?? {}),
      }}
    >
      {loading ? (
        <ActivityIndicator color={styles.textColor} />
      ) : (
        <Text style={{ color: styles.textColor, fontSize: fontSize.md, fontWeight: "600" }}>{title}</Text>
      )}
    </Pressable>
  );
}
