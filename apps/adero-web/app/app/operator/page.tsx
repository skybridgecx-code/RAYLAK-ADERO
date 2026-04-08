import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { requireAderoUser } from "@/lib/auth";
import { db, aderoTrips } from "@raylak/db";
import {
  ADERO_TRIP_STATUS_LABELS,
  type AderoTripStatus,
} from "@raylak/db/schema";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Operator Dashboard",
  robots: { index: false },
};

const TRIP_STATUS_STYLES: Record<AderoTripStatus, { bg: string; color: string }> = {
  assigned: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  operator_en_route: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
  operator_arrived: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
  in_progress: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  canceled: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

function fmtDatetime(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OperatorDashboardPage() {
  const aderoUser = await requireAderoUser();
  const trips = await db
    .select()
    .from(aderoTrips)
    .where(eq(aderoTrips.operatorId, aderoUser.id))
    .orderBy(desc(aderoTrips.createdAt));

  const activeTrips = trips.filter(
    (trip) => trip.status !== "completed" && trip.status !== "canceled",
  );
  const completedTrips = trips.filter((trip) => trip.status === "completed");

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Welcome back{aderoUser.firstName ? `, ${aderoUser.firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Your Adero operator dashboard. Manage active trips and lifecycle progression.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Active Trips
          </p>
          <p className="text-3xl font-bold" style={{ color: "#f1f5f9" }}>
            {activeTrips.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            Trips currently in progress
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Completed Jobs
          </p>
          <p className="text-3xl font-bold" style={{ color: "#f1f5f9" }}>
            {completedTrips.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            Finished trips assigned to you
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Profile Status
          </p>
          <p className="text-lg font-semibold" style={{ color: "#22c55e" }}>
            {aderoUser.operatorProfileId ? "Linked" : "Unlinked"}
          </p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            {aderoUser.operatorProfileId
              ? "Your operator profile is connected"
              : "No operator profile linked yet"}
          </p>
        </div>
      </div>

      {activeTrips.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-12 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            No active trips assigned.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#334155" }}>
            Assigned trips will appear here once dispatch is complete.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
            Active Trips
          </h2>
          <div className="space-y-2">
            {activeTrips.map((trip) => {
              const status = trip.status as AderoTripStatus;
              const statusStyle =
                TRIP_STATUS_STYLES[status] ?? TRIP_STATUS_STYLES.assigned;
              const statusLabel = ADERO_TRIP_STATUS_LABELS[status] ?? trip.status;

              return (
                <div
                  key={trip.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                        style={statusStyle}
                      >
                        {statusLabel}
                      </span>
                      <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                        {trip.pickupAddress}
                        <span style={{ color: "#475569" }}> → </span>
                        {trip.dropoffAddress}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>
                        Scheduled: {fmtDatetime(trip.scheduledAt)}
                      </p>
                    </div>
                    <Link
                      href={`/app/operator/trips/${trip.id}`}
                      className="shrink-0 rounded-md px-3 py-1.5 text-xs font-medium"
                      style={{ background: "rgba(99,102,241,0.16)", color: "#a5b4fc" }}
                    >
                      Open →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
