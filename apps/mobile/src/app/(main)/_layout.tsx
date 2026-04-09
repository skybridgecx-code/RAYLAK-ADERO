import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAderoAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function MainLayout() {
  const { isLoaded, isSignedIn } = useAderoAuth();

  if (!isLoaded) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            index: "home-outline",
            requests: "document-text-outline",
            offers: "briefcase-outline",
            trips: "car-outline",
            notifications: "notifications-outline",
            profile: "person-outline",
          };
          const iconName = iconMap[route.name] ?? "ellipse-outline";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="requests" options={{ title: "Requests" }} />
      <Tabs.Screen name="offers" options={{ title: "Offers" }} />
      <Tabs.Screen name="trips" options={{ title: "Trips" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="request/new" options={{ href: null }} />
      <Tabs.Screen name="request/[id]" options={{ href: null }} />
      <Tabs.Screen name="offer/[id]" options={{ href: null }} />
      <Tabs.Screen name="operator-trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]" options={{ href: null }} />
      <Tabs.Screen name="trip/[id]/rate" options={{ href: null }} />
    </Tabs>
  );
}
