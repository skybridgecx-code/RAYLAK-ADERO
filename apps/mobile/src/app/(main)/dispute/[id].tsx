import { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { borderRadius, colors, fontSize, spacing } from "@/lib/theme";

type MePayload = {
  user?: {
    id: string;
  };
};

type DisputeRecord = {
  id: string;
  tripId: string;
  filedByUserId: string;
  filedAgainstUserId?: string | null;
  category: string;
  priority: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
};

type DisputeMessage = {
  id: string;
  senderUserId?: string | null;
  senderRole: string;
  message: string;
  createdAt: string;
};

type DisputeDetailPayload = {
  dispute: DisputeRecord;
  messages: DisputeMessage[];
};

function getPriorityColors(priority: string) {
  if (priority === "urgent") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  if (priority === "high") {
    return { color: "#fb923c", bgColor: "rgba(251,146,60,0.18)" };
  }
  if (priority === "medium") {
    return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

function getStatusColors(status: string) {
  if (status === "resolved") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "open") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  if (status === "under_review") {
    return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
  }
  if (status === "escalated") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

function getCategoryColors() {
  return { color: colors.primary, bgColor: colors.primaryBg };
}

export default function DisputeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const disputeId = params.id ?? "";
  const { getToken, isLoaded } = useAderoAuth();
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [payload, setPayload] = useState<DisputeDetailPayload | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDispute = useCallback(async () => {
    if (!disputeId) {
      setError("Invalid dispute id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const [detail, me] = await Promise.all([
        apiClient<DisputeDetailPayload>(`disputes/${disputeId}`, { token }),
        apiClient<MePayload>("me", { token }).catch(() => null),
      ]);
      setPayload(detail);
      setCurrentUserId(me?.user?.id ?? null);
      setError(null);
    } catch (loadError) {
      setPayload(null);
      setCurrentUserId(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load dispute.");
    } finally {
      setIsLoading(false);
    }
  }, [disputeId, getToken]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadDispute();
  }, [isLoaded, loadDispute]);

  useEffect(() => {
    if (!payload) {
      return;
    }
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    });
  }, [payload?.messages.length]);

  const sendMessage = async () => {
    if (!payload || !message.trim()) {
      return;
    }

    setIsSending(true);
    try {
      const token = await getToken();
      const newMessage = await apiClient<DisputeMessage>(`disputes/${payload.dispute.id}/messages`, {
        method: "POST",
        token,
        body: { message: message.trim() },
      });
      setPayload({
        dispute: payload.dispute,
        messages: [...payload.messages, newMessage],
      });
      setMessage("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  if (!payload || error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: spacing.lg, gap: spacing.md }}>
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.error, fontSize: fontSize.md }}>
              {error ?? "Dispute not found."}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const categoryBadge = getCategoryColors();
  const priorityBadge = getPriorityColors(payload.dispute.priority);
  const statusBadge = getStatusColors(payload.dispute.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <ScrollView
          ref={(node) => {
            scrollViewRef.current = node;
          }}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl }}
        >
          <Button title="Back" variant="ghost" onPress={() => router.back()} />
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
              {payload.dispute.subject}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
              <StatusBadge label={payload.dispute.category.replaceAll("_", " ")} color={categoryBadge.color} bgColor={categoryBadge.bgColor} />
              <StatusBadge label={payload.dispute.priority} color={priorityBadge.color} bgColor={priorityBadge.bgColor} />
              <StatusBadge label={payload.dispute.status.replaceAll("_", " ")} color={statusBadge.color} bgColor={statusBadge.bgColor} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Filed {new Date(payload.dispute.createdAt).toLocaleString()}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.md }}>{payload.dispute.description}</Text>
          </Card>

          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Messages</Text>
            {payload.messages.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>No messages yet.</Text>
            ) : (
              payload.messages.map((item) => {
                const isCurrentUser = item.senderUserId === currentUserId && currentUserId !== null;
                return (
                  <View
                    key={item.id}
                    style={{
                      alignSelf: isCurrentUser ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      backgroundColor: isCurrentUser ? colors.primaryBg : colors.surface,
                      borderWidth: 1,
                      borderColor: isCurrentUser ? colors.primary : colors.border,
                      borderRadius: borderRadius.md,
                      padding: spacing.md,
                      gap: spacing.xs,
                    }}
                  >
                    <Text style={{ color: isCurrentUser ? colors.text : colors.textSecondary, fontSize: fontSize.xs, fontWeight: "600" }}>
                      {isCurrentUser ? "You" : item.senderRole.replaceAll("_", " ")}
                    </Text>
                    <Text style={{ color: colors.text, fontSize: fontSize.md }}>{item.message}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>

        <View style={{ padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
          {error ? (
            <Text style={{ color: colors.error, fontSize: fontSize.sm }}>{error}</Text>
          ) : null}
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Write a message"
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              minHeight: 96,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              paddingVertical: spacing.md,
              paddingHorizontal: spacing.md,
              color: colors.text,
              backgroundColor: "rgba(255,255,255,0.03)",
              textAlignVertical: "top",
            }}
          />
          <Button title="Send" loading={isSending} onPress={() => {
            void sendMessage();
          }} />
        </View>
      </View>
    </SafeAreaView>
  );
}
