import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type ProfilePayload = {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string | null;
  };
  trustScore?: {
    overallScore?: number | null;
    tier?: string | null;
  } | null;
  ratingAverage?: number | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, getToken, signOut } = useAderoAuth();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!isSignedIn) return;

    setIsLoading(true);
    try {
      const token = await getToken();
      const data = await apiClient<ProfilePayload>("me", { token });
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Profile</Text>
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
            {profile?.user?.name || profile?.user?.email || "Adero User"}
          </Text>
          <Text style={{ color: colors.textSecondary }}>Email: {profile?.user?.email ?? "Unknown"}</Text>
          <Text style={{ color: colors.textSecondary }}>Role: {profile?.user?.role ?? "Unknown"}</Text>
          <Text style={{ color: colors.textSecondary }}>
            Trust score: {profile?.trustScore?.overallScore != null ? Number(profile.trustScore.overallScore).toFixed(1) : "N/A"}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Tier: {profile?.trustScore?.tier ? String(profile.trustScore.tier) : "N/A"}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            Rating average: {profile?.ratingAverage != null ? Number(profile.ratingAverage).toFixed(2) : "N/A"}
          </Text>
        </Card>
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Quick Links</Text>
          <Pressable onPress={() => router.push("/(main)/invoices")}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="receipt-outline" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>My Invoices</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/(main)/disputes")}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="chatbox-ellipses-outline" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>My Disputes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
          <Pressable onPress={() => router.push("/(main)/incident/new")}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <Ionicons name="warning-outline" size={20} color={colors.textSecondary} />
                <Text style={{ color: colors.text, fontSize: fontSize.md }}>Report Incident</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        </Card>
        <Button title="Sign Out" variant="danger" onPress={() => void signOut()} />
      </ScrollView>
    </SafeAreaView>
  );
}
