import { Text, View } from "react-native";
import { borderRadius, fontSize, spacing } from "@/lib/theme";

type ServiceTypeBadgeProps = {
  serviceType: string;
};

const SERVICE_TYPE_STYLES: Record<
  string,
  { label: string; color: string; backgroundColor: string }
> = {
  airport_transfer: {
    label: "Airport Transfer",
    color: "#60a5fa",
    backgroundColor: "rgba(96,165,250,0.18)",
  },
  point_to_point: {
    label: "Point to Point",
    color: "#a78bfa",
    backgroundColor: "rgba(167,139,250,0.18)",
  },
  hourly: {
    label: "Hourly",
    color: "#4ade80",
    backgroundColor: "rgba(74,222,128,0.18)",
  },
  event: {
    label: "Event",
    color: "#fb923c",
    backgroundColor: "rgba(251,146,60,0.18)",
  },
};

export function ServiceTypeBadge({ serviceType }: ServiceTypeBadgeProps) {
  const style = SERVICE_TYPE_STYLES[serviceType] ?? {
    label: serviceType.replaceAll("_", " "),
    color: "#94a3b8",
    backgroundColor: "rgba(148,163,184,0.2)",
  };

  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        backgroundColor: style.backgroundColor,
      }}
    >
      <Text
        style={{
          color: style.color,
          fontSize: fontSize.xs,
          fontWeight: "600",
          textTransform: "uppercase",
        }}
      >
        {style.label}
      </Text>
    </View>
  );
}
