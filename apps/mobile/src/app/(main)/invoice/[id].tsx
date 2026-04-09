import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LoadingScreen } from "@/components/LoadingScreen";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api";
import { useAderoAuth } from "@/lib/auth";
import { colors, fontSize, spacing } from "@/lib/theme";

type MePayload = {
  user?: {
    id: string;
    role: string;
  };
};

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

type QuoteRecord = {
  id: string;
  baseFare?: string | number | null;
  distanceCharge?: string | number | null;
  timeCharge?: string | number | null;
  surgeCharge?: string | number | null;
  tolls?: string | number | null;
  gratuity?: string | number | null;
  discount?: string | number | null;
};

type TripRecord = {
  id: string;
  status: string;
  pickupAddress?: string | null;
  dropoffAddress?: string | null;
};

type PlatformFeeRecord = {
  feeAmount?: string | number | null;
  feePercent?: string | number | null;
};

type PaymentRecord = {
  id: string;
  status: string;
  amount: string | number;
  createdAt: string;
  processedAt?: string | null;
};

type PaymentSummary = {
  remainingAmount?: string | number;
  paidAmount?: string | number;
};

type InvoiceDetailPayload = {
  invoice: InvoiceRecord;
  quote: QuoteRecord | null;
  trip: TripRecord | null;
  platformFee: PlatformFeeRecord | null;
  payments: PaymentRecord[];
  paymentSummary: PaymentSummary | null;
};

function toUsd(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
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

function getPaymentStatusColors(status: string) {
  if (status === "succeeded" || status === "paid") {
    return { color: colors.success, bgColor: "rgba(74,222,128,0.18)" };
  }
  if (status === "failed" || status === "canceled") {
    return { color: colors.error, bgColor: "rgba(248,113,113,0.18)" };
  }
  return { color: colors.warning, bgColor: "rgba(253,224,71,0.18)" };
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const invoiceId = params.id ?? "";
  const { getToken, isLoaded } = useAderoAuth();
  const [payload, setPayload] = useState<InvoiceDetailPayload | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) {
      setError("Invalid invoice id.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken();
      const [invoicePayload, mePayload] = await Promise.all([
        apiClient<InvoiceDetailPayload>(`invoices/${invoiceId}`, { token }),
        apiClient<MePayload>("me", { token }).catch(() => null),
      ]);
      setPayload(invoicePayload);
      setRole(mePayload?.user?.role ?? null);
      setError(null);
    } catch (loadError) {
      setPayload(null);
      setRole(null);
      setError(loadError instanceof Error ? loadError.message : "Failed to load invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [getToken, invoiceId]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    void loadInvoice();
  }, [isLoaded, loadInvoice]);

  const payNow = async () => {
    if (!payload) {
      return;
    }

    setIsPaying(true);
    try {
      const token = await getToken();
      await apiClient<{ paymentId: string; clientSecret: string }>(`invoices/${payload.invoice.id}/pay`, {
        method: "POST",
        token,
      });
      Alert.alert("Payment initiated", "Your payment has been initiated. Stripe mobile checkout will be added next.");
      await loadInvoice();
    } catch (payError) {
      Alert.alert(
        "Unable to initiate payment",
        payError instanceof Error ? payError.message : "Please try again.",
      );
    } finally {
      setIsPaying(false);
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
              {error ?? "Invoice not found."}
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  const statusBadge = getInvoiceStatusColors(payload.invoice.status);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
            {payload.invoice.invoiceNumber}
          </Text>
          <StatusBadge label={payload.invoice.status} color={statusBadge.color} bgColor={statusBadge.bgColor} />
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Created {new Date(payload.invoice.createdAt).toLocaleString()}
          </Text>
        </Card>

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Line Items</Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Subtotal: {toUsd(payload.invoice.subtotal)}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
            Tax amount: {toUsd(payload.invoice.taxAmount)}
          </Text>
          <Text style={{ color: colors.text, fontSize: fontSize.xl, fontWeight: "700" }}>
            Total: {toUsd(payload.invoice.totalAmount)}
          </Text>
          {payload.paymentSummary?.paidAmount !== undefined ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Paid: {toUsd(payload.paymentSummary.paidAmount)}
            </Text>
          ) : null}
          {payload.paymentSummary?.remainingAmount !== undefined ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Remaining: {toUsd(payload.paymentSummary.remainingAmount)}
            </Text>
          ) : null}
        </Card>

        {payload.trip ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Trip Info</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Status: {payload.trip.status.replaceAll("_", " ")}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Pickup: {payload.trip.pickupAddress ?? "Unavailable"}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Dropoff: {payload.trip.dropoffAddress ?? "Unavailable"}
            </Text>
          </Card>
        ) : null}

        {payload.quote ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Quote Breakdown</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Base fare: {toUsd(payload.quote.baseFare)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Distance charge: {toUsd(payload.quote.distanceCharge)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Time charge: {toUsd(payload.quote.timeCharge)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Surge charge: {toUsd(payload.quote.surgeCharge)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Tolls: {toUsd(payload.quote.tolls)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Gratuity: {toUsd(payload.quote.gratuity)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>Discount: {toUsd(payload.quote.discount)}</Text>
          </Card>
        ) : null}

        {payload.platformFee ? (
          <Card>
            <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Platform Fee</Text>
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              Amount: {toUsd(payload.platformFee.feeAmount)}
            </Text>
            {payload.platformFee.feePercent !== undefined && payload.platformFee.feePercent !== null ? (
              <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                Fee percent: {(Number(payload.platformFee.feePercent) * 100).toFixed(2)}%
              </Text>
            ) : null}
          </Card>
        ) : null}

        <Card>
          <Text style={{ color: colors.text, fontSize: fontSize.lg, fontWeight: "600" }}>Payment History</Text>
          {payload.payments.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>No payments yet.</Text>
          ) : (
            payload.payments.map((payment) => {
              const badge = getPaymentStatusColors(payment.status);
              return (
                <View key={payment.id} style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.md, fontWeight: "600" }}>
                      {toUsd(payment.amount)}
                    </Text>
                    <StatusBadge label={payment.status} color={badge.color} bgColor={badge.bgColor} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
                    {new Date(payment.processedAt ?? payment.createdAt).toLocaleString()}
                  </Text>
                </View>
              );
            })
          )}
        </Card>

        {payload.invoice.status === "issued" && role === "requester" ? (
          <Button title="Pay Now" loading={isPaying} onPress={() => {
            void payNow();
          }} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
