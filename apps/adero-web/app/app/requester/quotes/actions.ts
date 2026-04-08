"use server";

import { desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { aderoQuotes, aderoRequests, db } from "@raylak/db";
import { requireAderoUser } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";
import { approveQuote, rejectQuote } from "@/lib/pricing";

function formatUsd(amount: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) {
    return "$0.00";
  }
  return `$${value.toFixed(2)}`;
}

function revalidateQuoteViews(requestId: string): void {
  revalidatePath("/app/requester");
  revalidatePath(`/app/requester/request/${requestId}`);
  revalidatePath(`/app/requester/request/${requestId}/quote`);
}

async function getOwnedRequest(
  requestId: string,
  requesterId: string,
): Promise<{ id: string; requesterId: string }> {
  const [request] = await db
    .select({
      id: aderoRequests.id,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoRequests)
    .where(eq(aderoRequests.id, requestId))
    .limit(1);

  if (!request) {
    throw new Error("Request not found.");
  }

  if (request.requesterId !== requesterId) {
    throw new Error("Forbidden.");
  }

  return request;
}

async function getOwnedQuote(
  quoteId: string,
  requesterId: string,
): Promise<{ id: string; requestId: string }> {
  const [quoteRecord] = await db
    .select({
      id: aderoQuotes.id,
      requestId: aderoQuotes.requestId,
      requesterId: aderoRequests.requesterId,
    })
    .from(aderoQuotes)
    .innerJoin(aderoRequests, eq(aderoQuotes.requestId, aderoRequests.id))
    .where(eq(aderoQuotes.id, quoteId))
    .limit(1);

  if (!quoteRecord) {
    throw new Error("Quote not found.");
  }

  if (quoteRecord.requesterId !== requesterId) {
    throw new Error("Forbidden.");
  }

  return {
    id: quoteRecord.id,
    requestId: quoteRecord.requestId,
  };
}

export async function getQuotesForRequest(requestId: string) {
  const aderoUser = await requireAderoUser();
  const request = await getOwnedRequest(requestId, aderoUser.id);

  return db
    .select()
    .from(aderoQuotes)
    .where(eq(aderoQuotes.requestId, request.id))
    .orderBy(desc(aderoQuotes.createdAt));
}

export async function approveQuoteAction(quoteId: string) {
  const aderoUser = await requireAderoUser();
  const ownedQuote = await getOwnedQuote(quoteId, aderoUser.id);
  const quote = await approveQuote(ownedQuote.id);

  await createNotification(
    aderoUser.id,
    "request_accepted",
    `Quote approved — ${formatUsd(quote.totalAmount)} for your trip`,
    "You approved a trip quote.",
    {
      quoteId: quote.id,
      requestId: ownedQuote.requestId,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
    },
  );

  revalidateQuoteViews(ownedQuote.requestId);

  return { success: true as const, quote };
}

export async function rejectQuoteAction(quoteId: string) {
  const aderoUser = await requireAderoUser();
  const ownedQuote = await getOwnedQuote(quoteId, aderoUser.id);
  const quote = await rejectQuote(ownedQuote.id);

  await createNotification(
    aderoUser.id,
    "offer_declined",
    "Quote declined",
    "You declined a trip quote.",
    {
      quoteId: quote.id,
      requestId: ownedQuote.requestId,
    },
  );

  revalidateQuoteViews(ownedQuote.requestId);

  return { success: true as const, quote };
}
