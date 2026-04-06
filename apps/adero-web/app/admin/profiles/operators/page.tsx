import type { Metadata } from "next";
import Link from "next/link";
import { aderoOperatorProfiles, db } from "@raylak/db";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { StatusBadge } from "~/components/status-badge";
import { VEHICLE_TYPE_LABELS, type VehicleType } from "~/lib/validators";
import { EmptyState, fmt } from "../profile-parts";

export const metadata: Metadata = {
  title: "Operator Profiles - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function OperatorProfilesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp["q"] === "string" ? sp["q"].trim() : "";

  const rows = await db
    .select()
    .from(aderoOperatorProfiles)
    .where(
      and(
        eq(aderoOperatorProfiles.activationStatus, "activated"),
        q
          ? or(
              ilike(aderoOperatorProfiles.fullName, `%${q}%`),
              ilike(aderoOperatorProfiles.email, `%${q}%`),
              ilike(aderoOperatorProfiles.city, `%${q}%`),
              ilike(aderoOperatorProfiles.state, `%${q}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(aderoOperatorProfiles.activatedAt))
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/profiles"
          className="text-xs transition-colors"
          style={{ color: "#475569" }}
        >
          &larr; Members
        </Link>
        <h1 className="mt-4 text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Operator Profiles
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          {rows.length} activated operators
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            Search
          </label>
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Operator, email, city, state..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          />
        </div>

        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#14b8a6", color: "#042f2e" }}
        >
          Filter
        </button>

        {q && (
          <Link
            href="/admin/profiles/operators"
            className="rounded-lg px-4 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: "#64748b" }}
          >
            Clear
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState label="No activated operator profiles match your filters." />
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {rows.map((profile) => {
            const vehicleLabel =
              VEHICLE_TYPE_LABELS[profile.vehicleType as VehicleType] ?? profile.vehicleType;
            const location = [profile.city, profile.state].filter(Boolean).join(", ");

            return (
              <Link
                key={profile.id}
                href={`/admin/profiles/operators/${profile.id}`}
                className="flex items-center gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                  style={{ background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }}
                >
                  Op
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: "#f1f5f9" }}>
                    {profile.fullName}
                  </p>
                  <p className="mt-0.5 truncate text-xs" style={{ color: "#475569" }}>
                    {location} - {vehicleLabel} - {profile.email}
                  </p>
                </div>

                <StatusBadge status={profile.activationStatus} />

                <p className="shrink-0 text-xs" style={{ color: "#475569" }}>
                  {fmt(profile.activatedAt)}
                </p>

                <span style={{ color: "#334155" }}>&rsaquo;</span>
              </Link>
            );
          })}
        </div>
      )}

      {rows.length === 100 && (
        <p className="text-center text-xs" style={{ color: "#475569" }}>
          Showing first 100 results. Narrow your search to see more.
        </p>
      )}
    </div>
  );
}
