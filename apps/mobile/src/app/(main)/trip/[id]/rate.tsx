import { useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StarRating } from "@/components/StarRating";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

type TripDetailPayload = {
  trip: {
    id: string;
    operatorId: string;
  };
};

export default function RateTripScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const tripId = params.id ?? "";
  const { getToken, isLoaded } = useAderoAuth();

  const [trip, setTrip] = useState<TripDetailPayload["trip"] | null>(null);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!tripId) {
        setError("Invalid trip id.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const token = await getToken();
        const payload = await apiClient<TripDetailPayload>(`trips/${tripId}`, { token });
        setTrip(payload.trip);
        setError(null);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load trip.";
        setTrip(null);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (isLoaded) {
      void load();
    }
  }, [getToken, isLoaded, tripId]);

  const submit = async () => {
    if (!trip) {
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      await apiClient(`trips/${trip.id}/rate`, {
        method: "POST",
        token,
        body: {
          tripId: trip.id,
          rateeUserId: trip.operatorId,
          raterRole: "requester",
          overallScore: score,
          comment: comment.trim() || undefined,
        },
      });
      Alert.alert("Thank you", "Your rating has been submitted.");
      router.back();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Failed to submit rating.";
      Alert.alert("Rating failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!trip || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error }}>{error ?? "Trip not found."}</Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
          Rate Trip
        </Text>
        <Card style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary }}>
            Operator ID: {trip.operatorId}
          </Text>
          <StarRating value={score} onChange={setScore} />
          <Text style={{ color: colors.textSecondary }}>Comment</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Optional feedback"
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            style={{
              minHeight: 120,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.md,
              color: colors.text,
              backgroundColor: "rgba(255,255,255,0.03)",
            }}
          />
          <Button title="Submit Rating" onPress={submit} loading={isSubmitting} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
