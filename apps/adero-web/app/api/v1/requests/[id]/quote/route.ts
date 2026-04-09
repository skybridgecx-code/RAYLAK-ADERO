import { desc, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { aderoQuotes, aderoRequests, db } from "@raylak/db";
import { ApiAuthError, authenticateRequest } from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";
import { approveQuote, rejectQuote } from "@/lib/pricing";
import { apiError, apiSuccess, getErrorMessage } from "@/app/api/v1/_utils";

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const ActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

function formatUsd(amount: string | number): string {
  const value = Number(amount);
  if (Number.isFinite(value) === false) {
    return "$0.00";
  }
  return `$${value.toFixed(2)}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid request id.", 400);
    }

    const { user } = await authenticateRequest();
    const requestId = parsedParams.data.id;

    const [requestRow] = await db
      .select({
        id: aderoRequests.id,
        requesterId: aderoRequests.requesterId,
      })
      .from(aderoRequests)
      .where(eq(aderoRequests.id, requestId))
      .limit(1);

    if (requestRow === undefined) {
      return apiError("Request not found.", 404);
    }

    if (user.role !== "admin" && requestRow.requesterId !== user.id) {
      return apiError("Forbidden", 403);
    }

    const quotes = await db
      .select()
      .from(aderoQuotes)
      .where(eq(aderoQuotes.requestId, requestId))
      .orderBy(desc(aderoQuotes.createdAt));

    return apiSuccess({
      request: requestRow,
      latestQuote: quotes[0] ?? null,
      quotes,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to load quotes."), 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const routeParams = await params;
    const parsedParams = ParamsSchema.safeParse(routeParams);
    if (parsedParams.success === false) {
      return apiError("Invalid request id.", 400);
    }

    const { user } = await authenticateRequest();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body.", 400);
    }

    const parsedAction = ActionSchema.safeParse(body);
    if (parsedAction.success === false) {
      return apiError("Invalid quote action.", 400);
    }

    const requestId = parsedParams.data.id;
    const [requestRow] = await db
      .select({
        id: aderoRequests.id,
        requesterId: aderoRequests.requesterId,
      })
      .from(aderoRequests)
      .where(eq(aderoRequests.id, requestId))
      .limit(1);

    if (requestRow === undefined) {
      return apiError("Request not found.", 404);
    }

    if (user.role !== "admin" && requestRow.requesterId !== user.id) {
      return apiError("Forbidden", 403);
    }

    const [latestQuote] = await db
      .select({
        id: aderoQuotes.id,
      })
      .from(aderoQuotes)
      .where(eq(aderoQuotes.requestId, requestId))
      .orderBy(desc(aderoQuotes.createdAt))
      .limit(1);

    if (latestQuote === undefined) {
      return apiError("No quote found for this request.", 404);
    }

    const quote =
      parsedAction.data.action === "approve"
        ? await approveQuote(latestQuote.id)
        : await rejectQuote(latestQuote.id);

    if (parsedAction.data.action === "approve") {
      await createNotification(
        requestRow.requesterId,
        "request_accepted",
        `Quote approved — ${formatUsd(quote.totalAmount)} for your trip`,
        "You approved the latest quote for this request.",
        {
          quoteId: quote.id,
          requestId: requestRow.id,
        },
      );
    } else {
      await createNotification(
        requestRow.requesterId,
        "offer_declined",
        "Quote rejected",
        "You rejected the latest quote for this request.",
        {
          quoteId: quote.id,
          requestId: requestRow.id,
        },
      );
    }

    return apiSuccess({ quote, action: parsedAction.data.action });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return apiError(error.message, error.status);
    }
    return apiError(getErrorMessage(error, "Failed to update quote."), 500);
  }
}
