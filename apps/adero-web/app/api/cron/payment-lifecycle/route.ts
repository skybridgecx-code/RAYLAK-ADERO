import { NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { aderoTrips, db } from "@raylak/db";
import {
  checkAndExpireQuotes,
  checkAndMarkOverdueInvoices,
} from "@/lib/payment-lifecycle";
import { notifyOnStaleLocation } from "@/lib/tracking-notifications";
import { isOperatorLocationStale } from "@/lib/tracking";

const TRACKABLE_TRIP_STATUSES = [
  "assigned",
  "operator_en_route",
  "operator_arrived",
  "in_progress",
] as const;

export async function GET(request: Request) {
  const cronSecret = request.headers.get("x-cron-secret");
  const adminSecret = process.env["ADERO_ADMIN_SECRET"];

  if (!adminSecret || cronSecret !== adminSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overdueInvoices = await checkAndMarkOverdueInvoices();
  const expiredQuotes = await checkAndExpireQuotes();

  const staleOperators: { notifiedCount: number; tripIds: string[] } = {
    notifiedCount: 0,
    tripIds: [],
  };

  try {
    const activeTrips = await db
      .select({
        tripId: aderoTrips.id,
        operatorId: aderoTrips.operatorId,
      })
      .from(aderoTrips)
      .where(inArray(aderoTrips.status, [...TRACKABLE_TRIP_STATUSES]));

    for (const trip of activeTrips) {
      const isStale = await isOperatorLocationStale(trip.operatorId);
      if (!isStale) continue;

      await notifyOnStaleLocation(trip.tripId, trip.operatorId);
      staleOperators.notifiedCount += 1;
      staleOperators.tripIds.push(trip.tripId);
    }
  } catch (error) {
    console.error("[adero/cron] stale tracking check failed:", error);
  }

  return NextResponse.json({
    overdueInvoices,
    expiredQuotes,
    staleOperators,
    timestamp: new Date().toISOString(),
  });
}
