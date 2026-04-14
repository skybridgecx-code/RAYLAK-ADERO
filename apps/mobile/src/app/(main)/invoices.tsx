import { useCallback, useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  tripId: string;
  requesterId: string;
  operatorId: string;
  subtotal: string | number;
  taxAmount: string | number;
  totalAmount: string | number;
  status: string;
  createdAt: string;
};

function toUsd(value: string | number) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "$0.00";
  }
  return `$${amount.toFixed(2)}`;
}

function getInvoiceStatusColors(status: string) {
  if (status === "paid") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "issued") {
    return { color: "#60a5fa", bgColor: "rgba(96,165,250,0.18)" };
  }
  if (status === "overdue") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  return { color: colors.textMuted, bgColor: "rgba(100,116,139,0.18)" };
}

export default function InvoicesScreen() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAderoAuth();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInvoices = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (!isSignedIn) {
      setInvoices([]);
      setIsLoading(false);
      return;
    }

    if (mode === "refresh") {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const token = await getToken();
      const data = await apiClient<InvoiceRecord[]>("invoices", { token });
      setInvoices(data);
    } catch {
      setInvoices([]);
    } finally {
      if (mode === "refresh") {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadInvoices();
  }, [isLoaded, loadInvoices]);

  if (!isLoaded || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, flexGrow: 1 }}
        ListHeaderComponent={
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700", marginBottom: spacing.md }}>
            Invoices
          </Text>
        }
        ListEmptyComponent={
          <Card>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.md }}>No invoices yet.</Text>
          </Card>
        }
        onRefresh={() => {
          void loadInvoices("refresh");
        }}
        refreshing={isRefreshing}
        renderItem={({ item }) => {
          const badge = getInvoiceStatusColors(item.status);
          return (
            <Pressable onPress={() => router.push(`/(main)/invoice/${item.id}`)}>
              <Card>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm }}>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "700", flex: 1 }}>
                    {item.invoiceNumber}
                  </Text>
                  <StatusBadge
                    label={item.status}
                    color={badge.color}
                    bgColor={badge.bgColor}
                  />
                </View>
                <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>
                  {toUsd(item.totalAmount)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                  Created {new Date(item.createdAt).toLocaleString()}
                </Text>
              </Card>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
