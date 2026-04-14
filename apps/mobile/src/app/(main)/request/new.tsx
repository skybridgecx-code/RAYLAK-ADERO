import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

const SERVICE_TYPES = [
  { value: "airport_transfer", label: "Airport Transfer" },
  { value: "point_to_point", label: "Point to Point" },
  { value: "hourly", label: "Hourly" },
  { value: "event", label: "Event" },
] as const;

type CreateRequestResponse = {
  request: { id: string };
  quoteCreated?: boolean;
  dispatchedOffers?: number;
};

function parsePickupDateTime(input: string) {
  const normalized = input.trim();
  const pattern = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/;
  if (!pattern.test(normalized)) {
    return null;
  }
  const [datePart, timePart] = normalized.split(" ");
  if (!datePart || !timePart) {
    return null;
  }
  const parsed = new Date(`${datePart}T${timePart}:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

export default function NewRequestScreen() {
  const router = useRouter();
  const { getToken } = useAderoAuth();

  const [serviceType, setServiceType] = useState<string>("airport_transfer");
  const [showServiceTypeOptions, setShowServiceTypeOptions] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [pickupAtInput, setPickupAtInput] = useState("");
  const [passengerCount, setPassengerCount] = useState("1");
  const [vehiclePreference, setVehiclePreference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedServiceLabel = useMemo(() => {
    const selected = SERVICE_TYPES.find((option) => option.value === serviceType);
    return selected?.label ?? "Select service type";
  }, [serviceType]);

  const submit = async () => {
    const pickupAt = parsePickupDateTime(pickupAtInput);
    if (!pickupAt) {
      Alert.alert("Invalid pickup time", "Use format YYYY-MM-DD HH:mm");
      return;
    }

    const parsedPassengerCount = Number.parseInt(passengerCount, 10);
    if (!Number.isFinite(parsedPassengerCount) || parsedPassengerCount <= 0) {
      Alert.alert("Invalid passenger count", "Passenger count must be a positive number.");
      return;
    }

    if (!pickupAddress.trim() || !dropoffAddress.trim()) {
      Alert.alert("Missing fields", "Pickup and dropoff addresses are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await getToken();
      const response = await apiClient<CreateRequestResponse>("requests", {
        method: "POST",
        token,
        body: {
          serviceType,
          pickupAddress: pickupAddress.trim(),
          dropoffAddress: dropoffAddress.trim(),
          pickupAt,
          passengerCount: parsedPassengerCount,
          vehiclePreference: vehiclePreference.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });

      if (!response.request?.id) {
        throw new Error("Request created but id was missing.");
      }

      router.replace(`/(main)/request/${response.request.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create request.";
      Alert.alert("Create request failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
          New Request
        </Text>
        <Card style={{ gap: spacing.md }}>
          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Service Type</Text>
            <Pressable
              onPress={() => setShowServiceTypeOptions((current) => !current)}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            >
              <Text style={{ color: colors.text, fontSize: fontSize.md }}>{selectedServiceLabel}</Text>
            </Pressable>
            {showServiceTypeOptions ? (
              <View
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  overflow: "hidden",
                }}
              >
                {SERVICE_TYPES.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setServiceType(option.value);
                      setShowServiceTypeOptions(false);
                    }}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.md,
                      backgroundColor: serviceType === option.value ? colors.primaryBg : "rgba(255,255,255,0.03)",
                    }}
                  >
                    <Text style={{ color: colors.text }}>{option.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Pickup Address</Text>
            <TextInput
              value={pickupAddress}
              onChangeText={setPickupAddress}
              placeholder="Pickup address"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Dropoff Address</Text>
            <TextInput
              value={dropoffAddress}
              onChangeText={setDropoffAddress}
              placeholder="Dropoff address"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Pickup At</Text>
            <TextInput
              value={pickupAtInput}
              onChangeText={setPickupAtInput}
              placeholder="YYYY-MM-DD HH:mm"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Passenger Count</Text>
            <TextInput
              value={passengerCount}
              onChangeText={setPassengerCount}
              keyboardType="number-pad"
              placeholder="1"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Vehicle Preference</Text>
            <TextInput
              value={vehiclePreference}
              onChangeText={setVehiclePreference}
              placeholder="Optional"
              placeholderTextColor={colors.textMuted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
              style={{
                minHeight: 110,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.md,
                color: colors.text,
                backgroundColor: "rgba(255,255,255,0.03)",
              }}
            />
          </View>

          <Button title="Submit Request" onPress={submit} loading={isSubmitting} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
