import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
};

export default function NotificationsScreen() {
  const { isLoaded, isSignedIn, getToken } = useAderoAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!isSignedIn) return;
    setIsLoading(true);
    try {
      const token = await getToken();
      const data = await apiClient<NotificationItem[]>("notifications", { token });
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markRead = async (notificationId: string) => {
    const target = items.find((item) => item.id === notificationId);
    if (!target || target.readAt) {
      return;
    }

    try {
      const token = await getToken();
      await apiClient("notifications", {
        method: "POST",
        token,
        body: { notificationIds: [notificationId] },
      });
      setItems((prev) => prev.map((item) => (item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item)));
    } catch {
      return;
    }
  };

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Notifications</Text>
        {items.length === 0 ? (
          <Card>
            <Text style={{ color: colors.textSecondary }}>No notifications yet.</Text>
          </Card>
        ) : (
          items.map((item) => (
            <Pressable key={item.id} onPress={() => void markRead(item.id)}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600", flex: 1 }}>{item.title}</Text>
                  {!item.readAt ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
                </View>
                <Text style={{ color: colors.textSecondary }}>{item.message}</Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
