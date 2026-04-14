import { useEffect } from "react";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, View } from "react-native";
import type * as Notifications from "expo-notifications";
import { useAderoAuth } from "@/lib/auth";
import { handleNotificationNavigation } from "@/lib/deep-linking";
import {
  addNotificationReceivedListener,
  addNotificationResponseListener,
  registerForPushNotifications,
} from "@/lib/notifications";
import { savePushToken } from "@/lib/push-token";
import { colors, fontSize } from "@/lib/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

function NotificationBootstrap() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAderoAuth();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    let isMounted = true;

    void (async () => {
      const expoPushToken = await registerForPushNotifications();
      if (!expoPushToken || !isSignedIn) {
        return;
      }

      const authToken = await getToken();
      if (!authToken || !isMounted) {
        return;
      }

      await savePushToken(expoPushToken, authToken);
    })();

    const responseSubscription = addNotificationResponseListener((response) => {
      const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
      handleNotificationNavigation(data, router);
    });

    const receivedSubscription = addNotificationReceivedListener((_notification: Notifications.Notification) => {
      return;
    });

    return () => {
      isMounted = false;
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [getToken, isLoaded, isSignedIn, router]);

  return null;
}

export default function RootLayout() {
  if (!publishableKey) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, textAlign: "center" }}>
              EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured
            </Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
          <NotificationBootstrap />
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
        </ClerkProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
