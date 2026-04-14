import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { aderoTrips, db } from "@raylak/db";
import {
  checkAndExpireQuotes,
  checkAndMarkOverdueInvoices,
} from "@/lib/payment-lifecycle";
import { checkAndExpireOffers } from "@/lib/offer-expiry";
import { notifyOnStaleLocation } from "@/lib/tracking-notifications";
import { isOperatorLocationStale } from "@/lib/tracking";
import { rateLimit } from "@/lib/rate-limit";

const TRACKABLE_TRIP_STATUSES = [
  "assigned",
  "operator_en_route",
  "operator_arrived",
  "in_progress",
] as const;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  const adminSecret = process.env["ADERO_ADMIN_SECRET"];

  if (!adminSecret || cronSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limiter = rateLimit(
    `cron:payment-lifecycle:${getClientIp(request)}`,
    1,
    30_000,
  );
  if (!limiter.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded", remaining: limiter.remaining },
      { status: 429 },
    );
  }

  const overdueInvoices: {
    ok: boolean;
    data: { markedCount: number; invoiceIds: string[] };
    error: string | null;
  } = {
    ok: false,
    data: { markedCount: 0, invoiceIds: [] },
    error: null,
  };

  const expiredQuotes: {
    ok: boolean;
    data: { expiredCount: number; quoteIds: string[] };
    error: string | null;
  } = {
    ok: false,
    data: { expiredCount: 0, quoteIds: [] },
    error: null,
  };

  const expiredOffers: {
    ok: boolean;
    data: { expiredCount: number; offerIds: string[] };
    error: string | null;
  } = {
    ok: false,
    data: { expiredCount: 0, offerIds: [] },
    error: null,
  };

  const staleOperators: {
    ok: boolean;
    data: { notifiedCount: number; tripIds: string[] };
    error: string | null;
  } = {
    ok: false,
    data: { notifiedCount: 0, tripIds: [] },
    error: null,
  };

  try {
    overdueInvoices.data = await checkAndMarkOverdueInvoices();
    overdueInvoices.ok = true;
  } catch (error) {
    overdueInvoices.error = toErrorMessage(error);
    console.error("[adero/cron] overdue invoice check failed:", error);
  }

  try {
    expiredQuotes.data = await checkAndExpireQuotes();
    expiredQuotes.ok = true;
  } catch (error) {
    expiredQuotes.error = toErrorMessage(error);
    console.error("[adero/cron] quote expiry check failed:", error);
  }

  try {
    expiredOffers.data = await checkAndExpireOffers();
    expiredOffers.ok = true;
  } catch (error) {
    expiredOffers.error = toErrorMessage(error);
    console.error("[adero/cron] offer expiry check failed:", error);
  }

  try {
    const activeTrips = await db
      .select({
        tripId: aderoTrips.id,
        operatorId: aderoTrips.operatorId,
      })
      .from(aderoTrips)
      .where(inArray(aderoTrips.status, [...TRACKABLE_TRIP_STATUSES]));

    for (const trip of activeTrips) {
      try {
        const isStale = await isOperatorLocationStale(trip.operatorId);
        if (!isStale) continue;

        await notifyOnStaleLocation(trip.tripId, trip.operatorId);
        staleOperators.data.notifiedCount += 1;
        staleOperators.data.tripIds.push(trip.tripId);
      } catch (error) {
        console.error("[adero/cron] stale operator notification failed:", error);
      }
    }

    staleOperators.ok = true;
  } catch (error) {
    staleOperators.error = toErrorMessage(error);
    console.error("[adero/cron] stale tracking check failed:", error);
  }

  return NextResponse.json({
    overdueInvoices,
    expiredQuotes,
    expiredOffers,
    staleOperators,
    timestamp: new Date().toISOString(),
    rateLimitRemaining: limiter.remaining,
  });
}
