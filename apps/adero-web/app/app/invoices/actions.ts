"use server";

import { desc, eq } from "drizzle-orm";
import {
  aderoInvoices,
  aderoPlatformFees,
  aderoQuotes,
  aderoTrips,
  db,
} from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import { getInvoicesForUser } from "@/lib/invoicing";

export async function getMyInvoices() {
  const aderoUser = await requireAderoUser();

  if (aderoUser.role === "admin") {
    return db.select().from(aderoInvoices).orderBy(desc(aderoInvoices.createdAt));
  }

  if (aderoUser.role === "requester" || aderoUser.role === "operator") {
    return getInvoicesForUser(aderoUser.id, aderoUser.role);
  }

  return [];
}

export async function getInvoiceDetail(invoiceId: string) {
  const aderoUser = await requireAderoUser();

  const [invoice] = await db
    .select()
    .from(aderoInvoices)
    .where(eq(aderoInvoices.id, invoiceId))
    .limit(1);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const isOwner =
    aderoUser.role === "admin" ||
    invoice.requesterId === aderoUser.id ||
    invoice.operatorId === aderoUser.id;

  if (!isOwner) {
    throw new Error("Forbidden.");
  }

  const [quote, trip, platformFee] = await Promise.all([
    invoice.quoteId
      ? db
          .select()
          .from(aderoQuotes)
          .where(eq(aderoQuotes.id, invoice.quoteId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select()
      .from(aderoTrips)
      .where(eq(aderoTrips.id, invoice.tripId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select()
      .from(aderoPlatformFees)
      .where(eq(aderoPlatformFees.invoiceId, invoice.id))
      .orderBy(desc(aderoPlatformFees.createdAt))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  return { invoice, quote, trip, platformFee };
}
