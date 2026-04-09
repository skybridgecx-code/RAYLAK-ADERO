import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Picker } from "@/components/Picker";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

const INCIDENT_SEVERITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Critical", value: "critical" },
];

const INCIDENT_CATEGORY_OPTIONS = [
  { label: "Accident", value: "accident" },
  { label: "Vehicle Breakdown", value: "vehicle_breakdown" },
  { label: "Passenger Injury", value: "passenger_injury" },
  { label: "Driver Injury", value: "driver_injury" },
  { label: "Road Hazard", value: "road_hazard" },
  { label: "Security Threat", value: "security_threat" },
  { label: "Medical Emergency", value: "medical_emergency" },
  { label: "Other", value: "other" },
];

function inputStyle(multiline = false) {
  return {
    minHeight: multiline ? 120 : undefined,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: "rgba(255,255,255,0.03)",
    textAlignVertical: multiline ? "top" : "center",
  } as const;
}

export default function NewIncidentScreen() {
  const router = useRouter();
  const { getToken } = useAderoAuth();
  const [tripId, setTripId] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [category, setCategory] = useState("other");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationText, setLocationText] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const useCurrentLocation = async () => {
    setIsGettingLocation(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Location permission was not granted.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(current.coords.latitude);
      setLongitude(current.coords.longitude);
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Unable to get current location.");
    } finally {
      setIsGettingLocation(false);
    }
  };

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const token = await getToken();
      await apiClient("incidents", {
        method: "POST",
        token,
        body: {
          tripId: tripId.trim() || undefined,
          severity,
          category,
          title: title.trim(),
          description: description.trim(),
          location: locationText.trim() || undefined,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
        },
      });
      router.replace("/(main)/incidents");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to report incident.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>Report Incident</Text>
        <Card style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Trip ID</Text>
          <TextInput
            value={tripId}
            onChangeText={setTripId}
            placeholder="Optional UUID"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={inputStyle()}
          />

          <Picker label="Severity" value={severity} onChange={setSeverity} options={INCIDENT_SEVERITY_OPTIONS} />
          <Picker label="Category" value={category} onChange={setCategory} options={INCIDENT_CATEGORY_OPTIONS} />

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Required"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the incident"
            placeholderTextColor={colors.textMuted}
            multiline
            style={inputStyle(true)}
          />

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Location</Text>
          <TextInput
            value={locationText}
            onChangeText={setLocationText}
            placeholder="Optional text description"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />

          <Button title="Use Current Location" variant="secondary" loading={isGettingLocation} onPress={() => {
            void useCurrentLocation();
          }} />
          {latitude !== null && longitude !== null ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Coordinates: {latitude.toFixed(5)}, {longitude.toFixed(5)}
            </Text>
          ) : null}

          {error ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm }}>{error}</Text>
          ) : null}

          <Button
            title="Submit"
            loading={isSubmitting}
            onPress={() => {
              void submit();
            }}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
