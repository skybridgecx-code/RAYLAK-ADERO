import type { Metadata } from "next";
import Link from "next/link";
import {
  aderoCompanyApplications,
  aderoCompanyProfiles,
  aderoOperatorApplications,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { ilike, or } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Search - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function like(q: string) {
  return `%${q}%`;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  pending: "#818cf8",
  reviewing: "#facc15",
  approved: "#fb923c",
  rejected: "#ef4444",
  paused: "#facc15",
  inactive: "#475569",
};

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: STATUS_COLORS[status] ?? "#475569" }}
    />
  );
}

function ResultSection({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          {label}
        </h2>
        <span className="text-xs tabular-nums" style={{ color: "#334155" }}>
          {count} result{count !== 1 ? "s" : ""}
        </span>
      </div>
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.07)" }}
      >
        {children}
      </div>
    </section>
  );
}

function ResultRow({
  href,
  primary,
  secondary,
  meta,
  status,
  badge,
  badgeColor,
}: {
  href: string;
  primary: string;
  secondary?: string;
  meta?: string;
  status?: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0 transition-colors hover:bg-white/[0.02]"
      style={{ borderColor: "rgba(255,255,255,0.05)" }}
    >
      <span
        className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={{ background: `${badgeColor}1a`, color: badgeColor }}
      >
        {badge}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm" style={{ color: "#e2e8f0" }}>
          {primary}
        </p>
        {secondary && (
          <p className="truncate text-xs" style={{ color: "#475569" }}>
            {secondary}
          </p>
        )}
      </div>
      {meta && (
        <span className="shrink-0 text-xs" style={{ color: "#334155" }}>
          {meta}
        </span>
      )}
      {status && (
        <span className="flex shrink-0 items-center gap-1.5">
          <StatusDot status={status} />
          <span className="text-xs capitalize" style={{ color: "#475569" }}>
            {status}
          </span>
        </span>
      )}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = rawQ?.trim() ?? "";
  const hasQuery = q.length >= 2;

  const [companyApps, operatorApps, companyProfiles, operatorProfiles] = hasQuery
    ? await Promise.all([
        db
          .select({
            id: aderoCompanyApplications.id,
            companyName: aderoCompanyApplications.companyName,
            email: aderoCompanyApplications.email,
            phone: aderoCompanyApplications.phone,
            status: aderoCompanyApplications.status,
            contactFirstName: aderoCompanyApplications.contactFirstName,
            contactLastName: aderoCompanyApplications.contactLastName,
          })
          .from(aderoCompanyApplications)
          .where(
            or(
              ilike(aderoCompanyApplications.companyName, like(q)),
              ilike(aderoCompanyApplications.email, like(q)),
              ilike(aderoCompanyApplications.contactFirstName, like(q)),
              ilike(aderoCompanyApplications.contactLastName, like(q)),
              ilike(aderoCompanyApplications.phone, like(q)),
            ),
          )
          .limit(15),
        db
          .select({
            id: aderoOperatorApplications.id,
            firstName: aderoOperatorApplications.firstName,
            lastName: aderoOperatorApplications.lastName,
            email: aderoOperatorApplications.email,
            phone: aderoOperatorApplications.phone,
            status: aderoOperatorApplications.status,
            city: aderoOperatorApplications.city,
            state: aderoOperatorApplications.state,
          })
          .from(aderoOperatorApplications)
          .where(
            or(
              ilike(aderoOperatorApplications.firstName, like(q)),
              ilike(aderoOperatorApplications.lastName, like(q)),
              ilike(aderoOperatorApplications.email, like(q)),
              ilike(aderoOperatorApplications.phone, like(q)),
            ),
          )
          .limit(15),
        db
          .select({
            id: aderoCompanyProfiles.id,
            companyName: aderoCompanyProfiles.companyName,
            contactName: aderoCompanyProfiles.contactName,
            email: aderoCompanyProfiles.email,
            phone: aderoCompanyProfiles.phone,
            activationStatus: aderoCompanyProfiles.activationStatus,
            serviceArea: aderoCompanyProfiles.serviceArea,
          })
          .from(aderoCompanyProfiles)
          .where(
            or(
              ilike(aderoCompanyProfiles.companyName, like(q)),
              ilike(aderoCompanyProfiles.contactName, like(q)),
              ilike(aderoCompanyProfiles.email, like(q)),
              ilike(aderoCompanyProfiles.phone, like(q)),
            ),
          )
          .limit(15),
        db
          .select({
            id: aderoOperatorProfiles.id,
            fullName: aderoOperatorProfiles.fullName,
            email: aderoOperatorProfiles.email,
            phone: aderoOperatorProfiles.phone,
            activationStatus: aderoOperatorProfiles.activationStatus,
            city: aderoOperatorProfiles.city,
            state: aderoOperatorProfiles.state,
          })
          .from(aderoOperatorProfiles)
          .where(
            or(
              ilike(aderoOperatorProfiles.fullName, like(q)),
              ilike(aderoOperatorProfiles.email, like(q)),
              ilike(aderoOperatorProfiles.phone, like(q)),
            ),
          )
          .limit(15),
      ])
    : [[], [], [], []];

  const totalResults =
    companyApps.length + operatorApps.length + companyProfiles.length + operatorProfiles.length;

  const noResults = hasQuery && totalResults === 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Search
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Find members, operators, and applications across the Adero network.
        </p>
      </div>

      {/* Search form */}
      <form method="GET" action="/admin/search" className="flex items-center gap-3">
        <input
          name="q"
          type="text"
          defaultValue={q}
          placeholder="Name, email, phone, or company…"
          autoComplete="off"
          autoFocus
          className="w-full max-w-lg rounded-lg border bg-transparent px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-500/60"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: "#e2e8f0" }}
        />
        <button
          type="submit"
          className="rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/search"
            className="text-xs transition-colors"
            style={{ color: "#475569" }}
          >
            Clear
          </Link>
        )}
      </form>

      {/* States */}
      {!hasQuery && (
        <p className="text-sm" style={{ color: "#334155" }}>
          Enter at least 2 characters to search.
        </p>
      )}

      {noResults && (
        <div
          className="rounded-xl border px-5 py-8 text-center"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.01)" }}
        >
          <p className="text-sm" style={{ color: "#475569" }}>
            No records found for{" "}
            <span style={{ color: "#94a3b8" }}>&ldquo;{q}&rdquo;</span>.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#334155" }}>
            Try a partial name, email address, or phone number.
          </p>
        </div>
      )}

      {/* Results */}
      {hasQuery && !noResults && (
        <div className="space-y-8">
          <p className="text-xs" style={{ color: "#334155" }}>
            {totalResults} result{totalResults !== 1 ? "s" : ""} for{" "}
            <span style={{ color: "#64748b" }}>&ldquo;{q}&rdquo;</span>
          </p>

          {/* Company profiles */}
          {companyProfiles.length > 0 && (
            <ResultSection label="Company Profiles" count={companyProfiles.length}>
              {companyProfiles.map((p) => (
                <ResultRow
                  key={p.id}
                  href={`/admin/profiles/companies/${p.id}`}
                  badge="Company"
                  badgeColor="#818cf8"
                  primary={p.companyName}
                  secondary={[p.contactName, p.email, p.phone].filter(Boolean).join(" · ")}
                  meta={p.serviceArea}
                  status={p.activationStatus}
                />
              ))}
            </ResultSection>
          )}

          {/* Operator profiles */}
          {operatorProfiles.length > 0 && (
            <ResultSection label="Operator Profiles" count={operatorProfiles.length}>
              {operatorProfiles.map((p) => (
                <ResultRow
                  key={p.id}
                  href={`/admin/profiles/operators/${p.id}`}
                  badge="Operator"
                  badgeColor="#2dd4bf"
                  primary={p.fullName}
                  secondary={[p.email, p.phone].filter(Boolean).join(" · ")}
                  meta={[p.city, p.state].filter(Boolean).join(", ")}
                  status={p.activationStatus}
                />
              ))}
            </ResultSection>
          )}

          {/* Company applications */}
          {companyApps.length > 0 && (
            <ResultSection label="Company Applications" count={companyApps.length}>
              {companyApps.map((a) => (
                <ResultRow
                  key={a.id}
                  href={`/admin/company/${a.id}`}
                  badge="Co. App"
                  badgeColor="#6366f1"
                  primary={a.companyName}
                  secondary={[
                    [a.contactFirstName, a.contactLastName].filter(Boolean).join(" "),
                    a.email,
                    a.phone,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  status={a.status}
                />
              ))}
            </ResultSection>
          )}

          {/* Operator applications */}
          {operatorApps.length > 0 && (
            <ResultSection label="Operator Applications" count={operatorApps.length}>
              {operatorApps.map((a) => (
                <ResultRow
                  key={a.id}
                  href={`/admin/operator/${a.id}`}
                  badge="Op. App"
                  badgeColor="#14b8a6"
                  primary={[a.firstName, a.lastName].filter(Boolean).join(" ")}
                  secondary={[a.email, a.phone].filter(Boolean).join(" · ")}
                  meta={[a.city, a.state].filter(Boolean).join(", ")}
                  status={a.status}
                />
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}
