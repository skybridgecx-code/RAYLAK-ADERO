import type { Metadata } from "next";
import Link from "next/link";
import {
  aderoCompanyProfiles,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { daysUntilExpiration, getDocumentDisplayStatus } from "~/lib/document-monitoring";
import { MEMBER_DOCUMENT_TYPE_LABELS, type MemberDocumentType } from "~/lib/validators";

export const metadata: Metadata = {
  title: "Renewal Queue - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function docLabel(documentType: string) {
  return (
    MEMBER_DOCUMENT_TYPE_LABELS[documentType as MemberDocumentType] ?? documentType
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RenewalQueuePage() {
  // Load all member documents and both profile tables in parallel
  const [allDocuments, companyProfiles, operatorProfiles] = await Promise.all([
    db.select().from(aderoMemberDocuments),
    db
      .select({ id: aderoCompanyProfiles.id, companyName: aderoCompanyProfiles.companyName })
      .from(aderoCompanyProfiles),
    db
      .select({ id: aderoOperatorProfiles.id, fullName: aderoOperatorProfiles.fullName })
      .from(aderoOperatorProfiles),
  ]);

  const companyNameById = new Map(companyProfiles.map((p) => [p.id, p.companyName]));
  const operatorNameById = new Map(operatorProfiles.map((p) => [p.id, p.fullName]));

  // ── Compute renewal-needed rows ───────────────────────────────────────────
  type RenewalRow = {
    documentId: string;
    memberType: "company" | "operator";
    profileId: string;
    memberName: string;
    documentType: string;
    documentTitle: string;
    displayStatus: "expired" | "expiring_soon";
    expirationDate: string;
    daysRemaining: number;
  };

  const renewalRows: RenewalRow[] = [];

  for (const doc of allDocuments) {
    const displayStatus = getDocumentDisplayStatus(doc);
    if (displayStatus !== "expired" && displayStatus !== "expiring_soon") continue;
    if (!doc.expirationDate) continue;

    const memberType = doc.memberType as "company" | "operator";
    const profileId =
      memberType === "company"
        ? (doc.companyProfileId ?? null)
        : (doc.operatorProfileId ?? null);
    if (!profileId) continue;

    const memberName =
      memberType === "company"
        ? (companyNameById.get(profileId) ?? "Unknown company")
        : (operatorNameById.get(profileId) ?? "Unknown operator");

    const daysRemaining = daysUntilExpiration(doc.expirationDate);

    renewalRows.push({
      documentId: doc.id,
      memberType,
      profileId,
      memberName,
      documentType: doc.documentType,
      documentTitle: doc.title,
      displayStatus,
      expirationDate: doc.expirationDate,
      daysRemaining,
    });
  }

  // Sort: expired first (most overdue at top), then expiring soon (soonest first)
  renewalRows.sort((a, b) => {
    if (a.displayStatus !== b.displayStatus) {
      return a.displayStatus === "expired" ? -1 : 1;
    }
    return a.daysRemaining - b.daysRemaining;
  });

  const expiredRows = renewalRows.filter((r) => r.displayStatus === "expired");
  const expiringSoonRows = renewalRows.filter((r) => r.displayStatus === "expiring_soon");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Renewal Queue
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Members with expired or expiring documents that may require renewal outreach.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Expired",
            value: expiredRows.length,
            color: expiredRows.length > 0 ? "#f87171" : "#334155",
            description: "Documents past their expiration date",
          },
          {
            label: "Expiring Soon",
            value: expiringSoonRows.length,
            color: expiringSoonRows.length > 0 ? "#fb923c" : "#334155",
            description: "Documents expiring within 30 days",
          },
          {
            label: "Total",
            value: renewalRows.length,
            color: renewalRows.length > 0 ? "#facc15" : "#334155",
            description: "Documents requiring renewal attention",
          },
        ].map(({ label, value, color, description }) => (
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
            <p className="mt-1 text-[11px]" style={{ color: "#334155" }}>
              {description}
            </p>
          </div>
        ))}
      </div>

      {renewalRows.length === 0 && (
        <div
          className="rounded-xl border px-5 py-10 text-center"
          style={{ borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.03)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#4ade80" }}>
            No documents require renewal attention.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            All tracked documents are current.
          </p>
        </div>
      )}

      {/* ── Expired documents ─────────────────────────────────────────────── */}
      {expiredRows.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
              Expired Documents
            </h2>
            <p className="mt-1 text-xs" style={{ color: "#475569" }}>
              These documents are past their expiration date. Members should be contacted for
              renewal.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-xl border divide-y"
            style={{
              borderColor: "rgba(239,68,68,0.2)",
              background: "rgba(239,68,68,0.02)",
            }}
          >
            {expiredRows.map((row) => (
              <RenewalRow key={row.documentId} row={row} />
            ))}
          </div>
        </section>
      )}

      {/* ── Expiring soon documents ────────────────────────────────────────── */}
      {expiringSoonRows.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
              Expiring Within 30 Days
            </h2>
            <p className="mt-1 text-xs" style={{ color: "#475569" }}>
              These documents will expire within 30 days. Proactive renewal outreach is
              recommended.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-xl border divide-y"
            style={{
              borderColor: "rgba(249,115,22,0.2)",
              background: "rgba(249,115,22,0.02)",
            }}
          >
            {expiringSoonRows.map((row) => (
              <RenewalRow key={row.documentId} row={row} />
            ))}
          </div>
        </section>
      )}

      <p className="text-xs" style={{ color: "#334155" }}>
        Use member profile pages to log compliance actions or send the portal link for renewal
        submissions.
      </p>
    </div>
  );
}

// ─── Row component ─────────────────────────────────────────────────────────────

function RenewalRow({
  row,
}: {
  row: {
    documentId: string;
    memberType: "company" | "operator";
    profileId: string;
    memberName: string;
    documentType: string;
    documentTitle: string;
    displayStatus: "expired" | "expiring_soon";
    expirationDate: string;
    daysRemaining: number;
  };
}) {
  const isExpired = row.displayStatus === "expired";
  const profileHref =
    row.memberType === "company"
      ? `/admin/profiles/companies/${row.profileId}`
      : `/admin/profiles/operators/${row.profileId}`;

  const urgencyColor = isExpired ? "#f87171" : "#fb923c";

  let expiryText: string;
  if (isExpired) {
    const overdueDays = Math.abs(row.daysRemaining);
    expiryText = `Expired ${fmtDate(row.expirationDate)} · ${overdueDays} day${overdueDays === 1 ? "" : "s"} ago`;
  } else {
    expiryText = `Expires ${fmtDate(row.expirationDate)} · ${row.daysRemaining} day${row.daysRemaining === 1 ? "" : "s"} remaining`;
  }

  return (
    <div
      className="flex flex-wrap items-start gap-3 px-5 py-4"
      style={{ borderColor: "rgba(255,255,255,0.04)" }}
    >
      {/* Member type pill */}
      <span
        className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
        style={
          row.memberType === "company"
            ? { background: "rgba(99,102,241,0.1)", color: "#818cf8" }
            : { background: "rgba(20,184,166,0.1)", color: "#2dd4bf" }
        }
      >
        {row.memberType === "company" ? "Company" : "Operator"}
      </span>

      {/* Member + document details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={profileHref}
            className="text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#e2e8f0" }}
          >
            {row.memberName}
          </Link>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}
          >
            {docLabel(row.documentType)}
          </span>
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={
              isExpired
                ? { background: "rgba(239,68,68,0.12)", color: "#f87171" }
                : { background: "rgba(249,115,22,0.12)", color: "#fb923c" }
            }
          >
            {isExpired ? "Expired" : "Expiring Soon"}
          </span>
        </div>

        <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
          {row.documentTitle}
        </p>

        <p className="mt-0.5 text-[11px] font-medium" style={{ color: urgencyColor }}>
          {expiryText}
        </p>
      </div>

      {/* Profile link */}
      <Link
        href={profileHref}
        className="shrink-0 self-start text-[11px] transition-opacity hover:opacity-70"
        style={{ color: "#818cf8" }}
      >
        View profile →
      </Link>
    </div>
  );
}
