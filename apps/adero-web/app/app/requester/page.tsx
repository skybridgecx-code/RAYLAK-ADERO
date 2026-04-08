import type { Metadata } from "next";
import Link from "next/link";
import { requireAderoUser } from "@/lib/auth";
import { db, aderoRequests } from "@raylak/db";
import {
  ADERO_REQUEST_STATUS_LABELS,
  ADERO_SERVICE_TYPE_LABELS,
  type AderoRequestStatus,
  type AderoServiceType,
} from "@raylak/db/schema";
import { eq, desc } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Requester Dashboard - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<AderoRequestStatus, { bg: string; color: string }> = {
  submitted: { bg: "rgba(99,102,241,0.12)", color: "#818cf8" },
  matched: { bg: "rgba(250,204,21,0.12)", color: "#fde047" },
  accepted: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
  in_progress: { bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" },
  completed: { bg: "rgba(100,116,139,0.12)", color: "#94a3b8" },
  canceled: { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
};

function fmtDatetime(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RequesterDashboardPage() {
  const aderoUser = await requireAderoUser();

  const requests = await db
    .select()
    .from(aderoRequests)
    .where(eq(aderoRequests.requesterId, aderoUser.id))
    .orderBy(desc(aderoRequests.createdAt));

  const activeRequests = requests.filter(
    (r) => r.status !== "completed" && r.status !== "canceled",
  );
  const completedRequests = requests.filter((r) => r.status === "completed");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            Welcome back{aderoUser.firstName ? `, ${aderoUser.firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Your Adero requester dashboard.
          </p>
        </div>
        <Link
          href="/app/requester/request/new"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          + New Request
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Active Requests",
            value: activeRequests.length,
            color: activeRequests.length > 0 ? "#818cf8" : "#334155",
          },
          {
            label: "Completed Trips",
            value: completedRequests.length,
            color: completedRequests.length > 0 ? "#4ade80" : "#334155",
          },
          {
            label: "Total Requests",
            value: requests.length,
            color: requests.length > 0 ? "#94a3b8" : "#334155",
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="rounded-xl border p-4"
            style={{
              borderColor: "rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <p className="text-2xl font-light tabular-nums" style={{ color }}>
              {value}
            </p>
            <p className="mt-0.5 text-xs font-medium" style={{ color: "#94a3b8" }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Request list */}
      {requests.length === 0 ? (
        <div
          className="rounded-xl border px-5 py-12 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "#64748b" }}>
            No requests yet.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#334155" }}>
            Create your first transportation request to get started.
          </p>
          <Link
            href="/app/requester/request/new"
            className="mt-4 inline-block rounded-lg px-4 py-2 text-sm font-medium"
            style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
          >
            Create a request →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
            Your Requests
          </h2>
          <div className="space-y-2">
            {requests.map((req) => {
              const statusStyle =
                STATUS_STYLES[req.status as AderoRequestStatus] ??
                STATUS_STYLES.submitted;
              const statusLabel =
                ADERO_REQUEST_STATUS_LABELS[req.status as AderoRequestStatus] ??
                req.status;
              const serviceLabel =
                ADERO_SERVICE_TYPE_LABELS[req.serviceType as AderoServiceType] ??
                req.serviceType;

              return (
                <div
                  key={req.id}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: "rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={statusStyle}
                        >
                          {statusLabel}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ background: "rgba(255,255,255,0.06)", color: "#64748b" }}
                        >
                          {serviceLabel}
                        </span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                        {req.pickupAddress}
                        <span style={{ color: "#475569" }}> → </span>
                        {req.dropoffAddress}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>
                        Pickup: {fmtDatetime(req.pickupAt)} · {req.passengerCount}{" "}
                        {req.passengerCount === 1 ? "passenger" : "passengers"}
                      </p>
                      {req.notes && (
                        <p className="text-xs" style={{ color: "#334155" }}>
                          {req.notes}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-[11px]" style={{ color: "#334155" }}>
                      {fmtDatetime(req.createdAt)}
                    </p>
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
