"use server";

import { desc, eq } from "drizzle-orm";
import { aderoInvoices, aderoPayments, db } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import { createPaymentForInvoice, getPaymentClientSecret } from "@/lib/stripe";

export async function initiatePayment(invoiceId: string) {
  const requester = await requireAderoUser();

  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      requesterId: aderoInvoices.requesterId,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.requesterId !== requester.id) {
    throw new Error("Forbidden.");
  }

  const payment = await createPaymentForInvoice(invoice.id);
  const clientSecret = await getPaymentClientSecret(payment.id);

  return { paymentId: payment.id, clientSecret };
}

export async function getMyPayments() {
  const requester = await requireAderoUser();

  return db
    .select({
      id: aderoPayments.id,
      invoiceId: aderoPayments.invoiceId,
      status: aderoPayments.status,
      method: aderoPayments.method,
      amount: aderoPayments.amount,
      currency: aderoPayments.currency,
      stripePaymentIntentId: aderoPayments.stripePaymentIntentId,
      stripeChargeId: aderoPayments.stripeChargeId,
      failureReason: aderoPayments.failureReason,
      refundedAmount: aderoPayments.refundedAmount,
      processedAt: aderoPayments.processedAt,
      createdAt: aderoPayments.createdAt,
      invoiceNumber: aderoInvoices.invoiceNumber,
      invoiceStatus: aderoInvoices.status,
      invoiceTotalAmount: aderoInvoices.totalAmount,
      invoiceDueDate: aderoInvoices.dueDate,
      tripId: aderoInvoices.tripId,
    })
    .from(aderoPayments)
    .innerJoin(aderoInvoices, eq(aderoPayments.invoiceId, aderoInvoices.id))
    .where(eq(aderoInvoices.requesterId, requester.id))
    .orderBy(desc(aderoPayments.createdAt));
}
