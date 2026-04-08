import "server-only";

import { and, desc, eq } from "drizzle-orm";
import {
  aderoInvoices,
  aderoPlatformFees,
  aderoQuotes,
  aderoRequests,
  aderoTrips,
  db,
} from "@raylak/db";
import { calculatePlatformFee, generateInvoiceNumber } from "@/lib/pricing";

export const INVOICE_DUE_DAYS = 30;

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMoney(value: string | number | null | undefined): number {
  return Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;
}

function toMoneyString(value: string | number | null | undefined): string {
  return toMoney(value).toFixed(2);
}

function toRateString(value: string | number | null | undefined): string {
  const parsed = toNumber(value);
  return Math.round((parsed + Number.EPSILON) * 10000).toFixed(4);
}

export async function createInvoiceForTrip(
  tripId: string,
): Promise<typeof aderoInvoices.$inferSelect> {
  const [trip] = await db
    .select({
      id: aderoTrips.id,
      requestId: aderoTrips.requestId,
      operatorId: aderoTrips.operatorId,
      status: aderoTrips.status,
    })
    .from(aderoTrips)
    .where(eq(aderoTrips.id, tripId))
    .limit(1);

  if (!trip) {
    throw new Error("Trip not found.");
  }

  if (trip.status !== "completed") {
    throw new Error("Invoices can only be created for completed trips.");
  }

  const [existingInvoice] = await db
    .select({ id: aderoInvoices.id })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.tripId, trip.id))
    .limit(1);

  if (existingInvoice) {
    throw new Error("Invoice already exists for this trip.");
  }

  const [request] = await db
    .select({
      id: aderoRequests.id,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoRequests)
    .where(eq(aderoRequests.id, trip.requestId))
    .limit(1);

  if (!request) {
    throw new Error("Request not found for trip.");
  }

  const [approvedQuote] = await db
    .select()
    .from(aderoQuotes)
    .where(
      and(
        eq(aderoQuotes.requestId, request.id),
        eq(aderoQuotes.status, "approved"),
      ),
    )
    .orderBy(desc(aderoQuotes.createdAt))
    .limit(1);

  const now = new Date();
  const dueDate = new Date(now.getTime() + INVOICE_DUE_DAYS * 24 * 60 * 60 * 1000);

  const invoicePayload: typeof aderoInvoices.$inferInsert = approvedQuote
    ? {
        invoiceNumber: generateInvoiceNumber(),
        tripId: trip.id,
        quoteId: approvedQuote.id,
        requesterId: request.requesterId,
        operatorId: trip.operatorId,
        status: "issued",
        subtotal: toMoneyString(approvedQuote.subtotal),
        taxRate: toRateString(approvedQuote.taxRate),
        taxAmount: toMoneyString(approvedQuote.taxAmount),
        totalAmount: toMoneyString(approvedQuote.totalAmount),
        paidAmount: "0.00",
        currency: approvedQuote.currency,
        dueDate,
        metadata: {
          baseFare: toMoneyString(approvedQuote.baseFare),
          distanceCharge: toMoneyString(approvedQuote.distanceCharge),
          timeCharge: toMoneyString(approvedQuote.timeCharge),
          surgeCharge: toMoneyString(approvedQuote.surgeCharge),
          tolls: toMoneyString(approvedQuote.tolls),
          gratuity: toMoneyString(approvedQuote.gratuity),
          discount: toMoneyString(approvedQuote.discount),
          estimatedDistanceMiles: approvedQuote.estimatedDistanceMiles,
          estimatedDurationMinutes: approvedQuote.estimatedDurationMinutes,
          quoteApprovedAt: approvedQuote.approvedAt?.toISOString() ?? null,
        },
        createdAt: now,
        updatedAt: now,
      }
    : {
        invoiceNumber: generateInvoiceNumber(),
        tripId: trip.id,
        quoteId: null,
        requesterId: request.requesterId,
        operatorId: trip.operatorId,
        status: "issued",
        subtotal: "0.00",
        taxRate: "0.0000",
        taxAmount: "0.00",
        totalAmount: "0.00",
        paidAmount: "0.00",
        currency: "usd",
        dueDate,
        metadata: {
          note: "No approved quote — manual pricing required",
        },
        createdAt: now,
        updatedAt: now,
      };

  const [invoice] = await db.insert(aderoInvoices).values(invoicePayload).returning();

  if (!invoice) {
    throw new Error("Invoice could not be created.");
  }

  const fee = calculatePlatformFee(toMoney(invoice.totalAmount));
  await db.insert(aderoPlatformFees).values({
    invoiceId: invoice.id,
    paymentId: null,
    feeType: "platform_commission",
    feePercent: fee.feePercent.toFixed(4),
    feeAmount: toMoneyString(fee.feeAmount),
    currency: invoice.currency,
    createdAt: now,
  });

  return invoice;
}

export async function getInvoiceByTripId(
  tripId: string,
): Promise<typeof aderoInvoices.$inferSelect | null> {
  const [invoice] = await db
    .select()
    .from(aderoInvoices)
    .where(eq(aderoInvoices.tripId, tripId))
    .limit(1);

  return invoice ?? null;
}

export async function getInvoicesForUser(
  userId: string,
  role: "requester" | "operator",
): Promise<(typeof aderoInvoices.$inferSelect)[]> {
  if (role === "requester") {
    return db
      .select()
      .from(aderoInvoices)
      .where(eq(aderoInvoices.requesterId, userId))
      .orderBy(desc(aderoInvoices.createdAt));
  }

  return db
    .select()
    .from(aderoInvoices)
    .where(eq(aderoInvoices.operatorId, userId))
    .orderBy(desc(aderoInvoices.createdAt));
}

export async function cancelInvoice(
  invoiceId: string,
): Promise<typeof aderoInvoices.$inferSelect> {
  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      status: aderoInvoices.status,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.status === "paid" || invoice.status === "refunded") {
    throw new Error(`Cannot cancel invoice in status "${invoice.status}".`);
  }

  const [updated] = await db
    .update(aderoInvoices)
    .set({
      status: "canceled",
      updatedAt: new Date(),
    })
    .where(eq(aderoInvoices.id, invoiceId))
    .returning();

  if (!updated) {
    throw new Error("Invoice could not be canceled.");
  }

  return updated;
}

export async function markInvoiceOverdue(
  invoiceId: string,
): Promise<typeof aderoInvoices.$inferSelect> {
  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      status: aderoInvoices.status,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.status !== "issued") {
    throw new Error(`Invoice must be "issued" to mark overdue (got "${invoice.status}").`);
  }

  const [updated] = await db
    .update(aderoInvoices)
    .set({
      status: "overdue",
      updatedAt: new Date(),
    })
    .where(eq(aderoInvoices.id, invoiceId))
    .returning();

  if (!updated) {
    throw new Error("Invoice could not be marked overdue.");
  }

  return updated;
}
