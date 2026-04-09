import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Picker } from "@/components/Picker";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

const DISPUTE_CATEGORY_OPTIONS = [
  { label: "Billing", value: "billing" },
  { label: "Service Quality", value: "service_quality" },
  { label: "Safety", value: "safety" },
  { label: "No Show", value: "no_show" },
  { label: "Property Damage", value: "property_damage" },
  { label: "Other", value: "other" },
];

const DISPUTE_PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

type DisputeRecord = {
  id: string;
};

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

export default function NewDisputeScreen() {
  const router = useRouter();
  const { getToken } = useAderoAuth();
  const [tripId, setTripId] = useState("");
  const [filedAgainstUserId, setFiledAgainstUserId] = useState("");
  const [category, setCategory] = useState("billing");
  const [priority, setPriority] = useState("medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const dispute = await apiClient<DisputeRecord>("disputes", {
        method: "POST",
        token,
        body: {
          tripId: tripId.trim(),
          filedAgainstUserId: filedAgainstUserId.trim() || undefined,
          category,
          priority,
          subject: subject.trim(),
          description: description.trim(),
        },
      });
      router.replace(`/(main)/dispute/${dispute.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to file dispute.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>File Dispute</Text>
        <Card style={{ gap: spacing.md }}>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Trip ID</Text>
          <TextInput
            value={tripId}
            onChangeText={setTripId}
            placeholder="Required UUID"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={inputStyle()}
          />

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Filed Against User ID</Text>
          <TextInput
            value={filedAgainstUserId}
            onChangeText={setFiledAgainstUserId}
            placeholder="Optional UUID"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={inputStyle()}
          />

          <Picker label="Category" value={category} onChange={setCategory} options={DISPUTE_CATEGORY_OPTIONS} />
          <Picker label="Priority" value={priority} onChange={setPriority} options={DISPUTE_PRIORITY_OPTIONS} />

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Required"
            placeholderTextColor={colors.textMuted}
            style={inputStyle()}
          />

          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the issue"
            placeholderTextColor={colors.textMuted}
            multiline
            style={inputStyle(true)}
          />

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
