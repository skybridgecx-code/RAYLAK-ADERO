import "server-only";

import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
  sum,
} from "drizzle-orm";
import {
  aderoInvoices,
  aderoPayments,
  aderoPlatformFees,
  aderoQuotes,
  aderoRequests,
  db,
} from "@raylak/db";
import { getInvoicesForUser, markInvoiceOverdue } from "@/lib/invoicing";
import { createNotification } from "@/lib/notifications";

export const OVERDUE_GRACE_DAYS = 3;
export const QUOTE_EXPIRY_CHECK_BUFFER_MINUTES = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

type PaymentSummaryPayment = {
  id: string;
  status: string;
  method: string;
  amount: number;
  processedAt: Date | null;
  createdAt: Date;
};

export type PaymentSummary = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  payments: PaymentSummaryPayment[];
  platformFee: { feePercent: number; feeAmount: number } | null;
  isFullyPaid: boolean;
  isOverdue: boolean;
  daysUntilDue: number | null;
};

export type RevenueStats = {
  totalInvoiced: number;
  totalCollected: number;
  totalOutstanding: number;
  totalOverdue: number;
  totalPlatformFees: number;
  invoiceCount: number;
  paidCount: number;
  overdueCount: number;
  averageInvoiceAmount: number;
};

function toNumber(value: string | number | null | undefined): number {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toMoney(value: string | number | null | undefined): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function formatMoney(value: string | number | null | undefined): string {
  return `$${toMoney(value).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function checkAndMarkOverdueInvoices(): Promise<{
  markedCount: number;
  invoiceIds: string[];
}> {
  const threshold = new Date(Date.now() - OVERDUE_GRACE_DAYS * DAY_MS);

  const dueInvoices = await db
    .select({
      id: aderoInvoices.id,
      invoiceNumber: aderoInvoices.invoiceNumber,
      dueDate: aderoInvoices.dueDate,
      requesterId: aderoInvoices.requesterId,
      operatorId: aderoInvoices.operatorId,
    })
    .from(aderoInvoices)
    .where(and(eq(aderoInvoices.status, "issued"), lt(aderoInvoices.dueDate, threshold)));

  const markedIds: string[] = [];

  for (const invoice of dueInvoices) {
    try {
      await markInvoiceOverdue(invoice.id);

      const dueLabel = formatDate(invoice.dueDate);
      await Promise.all([
        createNotification(
          invoice.requesterId,
          "trip_status_changed",
          `Invoice #${invoice.invoiceNumber} is overdue`,
          `Invoice #${invoice.invoiceNumber} is overdue — payment was due on ${dueLabel}.`,
          {
            invoiceId: invoice.id,
            dueDate: invoice.dueDate.toISOString(),
          },
        ),
        createNotification(
          invoice.operatorId,
          "trip_status_changed",
          `Invoice #${invoice.invoiceNumber} is overdue`,
          `Invoice #${invoice.invoiceNumber} for your trip is overdue.`,
          {
            invoiceId: invoice.id,
            dueDate: invoice.dueDate.toISOString(),
          },
        ),
      ]);

      markedIds.push(invoice.id);
    } catch (error) {
      console.error("[adero/payment-lifecycle] failed to mark overdue invoice", {
        invoiceId: invoice.id,
        error,
      });
    }
  }

  return {
    markedCount: markedIds.length,
    invoiceIds: markedIds,
  };
}

export async function checkAndExpireQuotes(): Promise<{
  expiredCount: number;
  quoteIds: string[];
}> {
  const threshold = new Date(
    Date.now() - QUOTE_EXPIRY_CHECK_BUFFER_MINUTES * 60 * 1000,
  );

  const quotes = await db
    .select({
      id: aderoQuotes.id,
      requestId: aderoQuotes.requestId,
      requesterId: aderoRequests.requesterId,
      expiresAt: aderoQuotes.expiresAt,
    })
    .from(aderoQuotes)
    .innerJoin(aderoRequests, eq(aderoQuotes.requestId, aderoRequests.id))
    .where(
      and(
        or(eq(aderoQuotes.status, "sent"), eq(aderoQuotes.status, "draft")),
        isNotNull(aderoQuotes.expiresAt),
        lt(aderoQuotes.expiresAt, threshold),
      ),
    );

  const expiredIds: string[] = [];

  for (const quote of quotes) {
    try {
      const [updatedQuote] = await db
        .update(aderoQuotes)
        .set({
          status: "expired",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(aderoQuotes.id, quote.id),
            or(eq(aderoQuotes.status, "sent"), eq(aderoQuotes.status, "draft")),
          ),
        )
        .returning({ id: aderoQuotes.id });

      if (!updatedQuote) {
        continue;
      }

      await createNotification(
        quote.requesterId,
        "trip_status_changed",
        "Quote expired",
        "Your quote has expired — request a new one.",
        {
          quoteId: quote.id,
          requestId: quote.requestId,
          expiresAt: quote.expiresAt?.toISOString() ?? null,
        },
      );

      expiredIds.push(quote.id);
    } catch (error) {
      console.error("[adero/payment-lifecycle] failed to expire quote", {
        quoteId: quote.id,
        error,
      });
    }
  }

  return {
    expiredCount: expiredIds.length,
    quoteIds: expiredIds,
  };
}

export async function getPaymentSummaryForInvoice(
  invoiceId: string,
): Promise<PaymentSummary> {
  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      invoiceNumber: aderoInvoices.invoiceNumber,
      status: aderoInvoices.status,
      totalAmount: aderoInvoices.totalAmount,
      paidAmount: aderoInvoices.paidAmount,
      dueDate: aderoInvoices.dueDate,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const [payments, feeRows] = await Promise.all([
    db
      .select({
        id: aderoPayments.id,
        status: aderoPayments.status,
        method: aderoPayments.method,
        amount: aderoPayments.amount,
        processedAt: aderoPayments.processedAt,
        createdAt: aderoPayments.createdAt,
      })
      .from(aderoPayments)
      .where(eq(aderoPayments.invoiceId, invoice.id))
      .orderBy(asc(aderoPayments.createdAt)),
    db
      .select({
        feePercent: aderoPlatformFees.feePercent,
        feeAmount: aderoPlatformFees.feeAmount,
      })
      .from(aderoPlatformFees)
      .where(eq(aderoPlatformFees.invoiceId, invoice.id))
      .orderBy(desc(aderoPlatformFees.createdAt))
      .limit(1),
  ]);

  const totalAmount = toMoney(invoice.totalAmount);
  const paidAmount = toMoney(invoice.paidAmount);
  const remainingAmount = toMoney(Math.max(0, totalAmount - paidAmount));
  const isFullyPaid = paidAmount >= totalAmount;
  const isOverdue =
    invoice.status === "overdue" ||
    (invoice.status === "issued" && invoice.dueDate.getTime() < Date.now());

  const daysUntilDue =
    invoice.status === "paid" || invoice.status === "canceled"
      ? null
      : Math.ceil((invoice.dueDate.getTime() - Date.now()) / DAY_MS);

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceStatus: invoice.status,
    totalAmount,
    paidAmount,
    remainingAmount,
    payments: payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      method: payment.method,
      amount: toMoney(payment.amount),
      processedAt: payment.processedAt,
      createdAt: payment.createdAt,
    })),
    platformFee: feeRows[0]
      ? {
          feePercent: toNumber(feeRows[0].feePercent),
          feeAmount: toMoney(feeRows[0].feeAmount),
        }
      : null,
    isFullyPaid,
    isOverdue,
    daysUntilDue,
  };
}

export async function getPaymentSummariesForUser(
  userId: string,
  role: "requester" | "operator",
): Promise<PaymentSummary[]> {
  const invoices = await getInvoicesForUser(userId, role);
  return Promise.all(invoices.map((invoice) => getPaymentSummaryForInvoice(invoice.id)));
}

export async function sendPaymentReminder(invoiceId: string): Promise<void> {
  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      requesterId: aderoInvoices.requesterId,
      invoiceNumber: aderoInvoices.invoiceNumber,
      status: aderoInvoices.status,
      totalAmount: aderoInvoices.totalAmount,
      dueDate: aderoInvoices.dueDate,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.status !== "issued" && invoice.status !== "overdue") {
    throw new Error(`Cannot send reminder for invoice status \"${invoice.status}\".`);
  }

  const summary = await getPaymentSummaryForInvoice(invoice.id);
  const dueLabel = formatDate(invoice.dueDate);

  let dueContext = "";
  if (summary.daysUntilDue !== null) {
    if (summary.daysUntilDue < 0) {
      dueContext = `${Math.abs(summary.daysUntilDue)} day(s) past due`;
    } else if (summary.daysUntilDue === 0) {
      dueContext = "due today";
    } else {
      dueContext = `${summary.daysUntilDue} day(s) until due`;
    }
  }

  const dueClause =
    invoice.status === "overdue" || summary.isOverdue
      ? "is overdue"
      : `is due on ${dueLabel}`;

  const message = `Payment reminder — Invoice #${invoice.invoiceNumber} for ${formatMoney(invoice.totalAmount)} ${dueClause}.${dueContext ? ` (${dueContext})` : ""}`;

  await createNotification(
    invoice.requesterId,
    "trip_status_changed",
    "Payment reminder",
    message,
    {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: invoice.dueDate.toISOString(),
      daysUntilDue: summary.daysUntilDue,
    },
  );
}

export async function getRevenueStats(): Promise<RevenueStats> {
  const [invoiceStatsRow, collectedRow, feeRow] = await Promise.all([
    db
      .select({
        totalInvoiced: sum(aderoInvoices.totalAmount),
        invoiceCount: count(aderoInvoices.id),
        averageInvoiceAmount: avg(aderoInvoices.totalAmount),
        paidCount: sql<number>`count(case when ${aderoInvoices.status} = 'paid' then 1 end)`,
        overdueCount: sql<number>`count(case when ${aderoInvoices.status} = 'overdue' then 1 end)`,
        totalOverdue: sql<string | null>`coalesce(sum(case when ${aderoInvoices.status} = 'overdue' then ${aderoInvoices.totalAmount} else 0 end), 0)`,
      })
      .from(aderoInvoices)
      .where(ne(aderoInvoices.status, "canceled")),
    db
      .select({
        totalCollected: sum(aderoInvoices.paidAmount),
      })
      .from(aderoInvoices)
      .where(inArray(aderoInvoices.status, ["paid", "partially_paid"])),
    db
      .select({
        totalPlatformFees: sum(aderoPlatformFees.feeAmount),
      })
      .from(aderoPlatformFees),
  ]);

  const invoiceStats = invoiceStatsRow[0];
  const collected = collectedRow[0];
  const fees = feeRow[0];

  const totalInvoiced = toMoney(invoiceStats?.totalInvoiced);
  const totalCollected = toMoney(collected?.totalCollected);

  return {
    totalInvoiced,
    totalCollected,
    totalOutstanding: toMoney(totalInvoiced - totalCollected),
    totalOverdue: toMoney(invoiceStats?.totalOverdue),
    totalPlatformFees: toMoney(fees?.totalPlatformFees),
    invoiceCount: toNumber(invoiceStats?.invoiceCount),
    paidCount: toNumber(invoiceStats?.paidCount),
    overdueCount: toNumber(invoiceStats?.overdueCount),
    averageInvoiceAmount: toMoney(invoiceStats?.averageInvoiceAmount),
  };
}
