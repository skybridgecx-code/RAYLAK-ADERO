"use server";

import { eq } from "drizzle-orm";
import { aderoInvoices, db } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";

export async function getRequesterInvoicePayContext(invoiceId: string) {
  const aderoUser = await requireAderoUser();

  if (aderoUser.role !== "requester" && aderoUser.role !== "company") {
    throw new Error("Forbidden.");
  }

  const [invoice] = await db
    .select({
      id: aderoInvoices.id,
      invoiceNumber: aderoInvoices.invoiceNumber,
      requesterId: aderoInvoices.requesterId,
      status: aderoInvoices.status,
      totalAmount: aderoInvoices.totalAmount,
      paidAmount: aderoInvoices.paidAmount,
      currency: aderoInvoices.currency,
      dueDate: aderoInvoices.dueDate,
      createdAt: aderoInvoices.createdAt,
    })
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  if (invoice.requesterId !== aderoUser.id) {
    throw new Error("Forbidden.");
  }

  return {
    invoice,
    isPayable: invoice.status === "issued" || invoice.status === "overdue",
  };
}
