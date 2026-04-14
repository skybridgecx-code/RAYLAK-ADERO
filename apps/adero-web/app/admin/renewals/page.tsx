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
import { RenewalOutreachButton } from "./renewal-outreach-button";

export const metadata: Metadata = {
  title: "Renewal Queue - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// ─── Types ─────────────────────────────────────────────────────────────────────

type DocRenewalEntry = {
  documentType: string;
  documentTitle: string;
  displayStatus: "expired" | "expiring_soon";
  expirationDate: string;
  daysRemaining: number;
};

type MemberRenewalGroup = {
  memberType: "company" | "operator";
  profileId: string;
  memberName: string;
  memberEmail: string;
  portalToken: string;
  isTokenExpired: boolean;
  expiredDocs: DocRenewalEntry[];
  expiringSoonDocs: DocRenewalEntry[];
  /** Most urgent days-remaining value for sort ordering. */
  urgencyScore: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function docLabel(documentType: string) {
  return MEMBER_DOCUMENT_TYPE_LABELS[documentType as MemberDocumentType] ?? documentType;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RenewalQueuePage() {
  const now = new Date();

  const [allDocuments, companyProfiles, operatorProfiles] = await Promise.all([
    db.select().from(aderoMemberDocuments),
    db
      .select({
        id: aderoCompanyProfiles.id,
        companyName: aderoCompanyProfiles.companyName,
        email: aderoCompanyProfiles.email,
        portalToken: aderoCompanyProfiles.portalToken,
        portalTokenExpiresAt: aderoCompanyProfiles.portalTokenExpiresAt,
      })
      .from(aderoCompanyProfiles),
    db
      .select({
        id: aderoOperatorProfiles.id,
        fullName: aderoOperatorProfiles.fullName,
        email: aderoOperatorProfiles.email,
        portalToken: aderoOperatorProfiles.portalToken,
        portalTokenExpiresAt: aderoOperatorProfiles.portalTokenExpiresAt,
      })
      .from(aderoOperatorProfiles),
  ]);

  // ── Build member lookup maps ───────────────────────────────────────────────
  const companyById = new Map(
    companyProfiles.map((p) => [
      p.id,
      {
        memberName: p.companyName,
        email: p.email,
        portalToken: p.portalToken,
        isTokenExpired: p.portalTokenExpiresAt !== null && p.portalTokenExpiresAt <= now,
      },
    ]),
  );
  const operatorById = new Map(
    operatorProfiles.map((p) => [
      p.id,
      {
        memberName: p.fullName,
        email: p.email,
        portalToken: p.portalToken,
        isTokenExpired: p.portalTokenExpiresAt !== null && p.portalTokenExpiresAt <= now,
      },
    ]),
  );

  // ── Group renewal-needed documents by member ───────────────────────────────
  const groupMap = new Map<string, MemberRenewalGroup>();

  for (const doc of allDocuments) {
    const displayStatus = getDocumentDisplayStatus(doc, now);
    if (displayStatus !== "expired" && displayStatus !== "expiring_soon") continue;
    if (!doc.expirationDate) continue;

    const memberType = doc.memberType as "company" | "operator";
    const profileId =
      memberType === "company" ? (doc.companyProfileId ?? null) : (doc.operatorProfileId ?? null);
    if (!profileId) continue;

    const profile =
      memberType === "company" ? companyById.get(profileId) : operatorById.get(profileId);
    if (!profile) continue;

    const key = `${memberType}:${profileId}`;
    const daysRemaining = daysUntilExpiration(doc.expirationDate, now);

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        memberType,
        profileId,
        memberName: profile.memberName,
        memberEmail: profile.email,
        portalToken: profile.portalToken,
        isTokenExpired: profile.isTokenExpired,
        expiredDocs: [],
        expiringSoonDocs: [],
        urgencyScore: daysRemaining,
      });
    }

    const group = groupMap.get(key)!;

    const entry: DocRenewalEntry = {
      documentType: doc.documentType,
      documentTitle: doc.title,
      displayStatus,
      expirationDate: doc.expirationDate,
      daysRemaining,
    };

    if (displayStatus === "expired") {
      group.expiredDocs.push(entry);
      // Most overdue (most negative) = highest urgency
      if (daysRemaining < group.urgencyScore) group.urgencyScore = daysRemaining;
    } else {
      group.expiringSoonDocs.push(entry);
      if (daysRemaining < group.urgencyScore) group.urgencyScore = daysRemaining;
    }
  }

  // Sort each group's doc lists by urgency
  for (const group of groupMap.values()) {
    group.expiredDocs.sort((a, b) => a.daysRemaining - b.daysRemaining);
    group.expiringSoonDocs.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }

  // Separate and sort groups: expired members first (by urgencyScore asc), then expiring-soon
  const allGroups = [...groupMap.values()].sort((a, b) => a.urgencyScore - b.urgencyScore);
  const expiredGroups = allGroups.filter((g) => g.expiredDocs.length > 0);
  const expiringSoonGroups = allGroups.filter((g) => g.expiredDocs.length === 0);

  const totalExpiredDocs = allGroups.reduce((s, g) => s + g.expiredDocs.length, 0);
  const totalExpiringSoonDocs = allGroups.reduce((s, g) => s + g.expiringSoonDocs.length, 0);
  const totalMembers = allGroups.length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Renewal Queue
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Members with expired or expiring documents. Use the outreach buttons to send renewal
          emails directly from here.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Members Affected",
            value: totalMembers,
            color: totalMembers > 0 ? "#facc15" : "#334155",
            description: "Members with at least one renewal need",
          },
          {
            label: "Expired Documents",
            value: totalExpiredDocs,
            color: totalExpiredDocs > 0 ? "#f87171" : "#334155",
            description: "Documents past their expiration date",
          },
          {
            label: "Expiring Within 30 Days",
            value: totalExpiringSoonDocs,
            color: totalExpiringSoonDocs > 0 ? "#fb923c" : "#334155",
            description: "Documents expiring within 30 days",
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

      {totalMembers === 0 && (
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

      {/* ── Members with expired documents ──────────────────────────────────── */}
      {expiredGroups.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
              Members with Expired Documents
            </h2>
            <p className="mt-1 text-xs" style={{ color: "#475569" }}>
              Documents are past their expiration date. Renewal is required.
            </p>
          </div>
          <div className="space-y-3">
            {expiredGroups.map((group) => (
              <MemberRenewalCard key={`${group.memberType}:${group.profileId}`} group={group} />
            ))}
          </div>
        </section>
      )}

      {/* ── Members with only expiring-soon documents ────────────────────────── */}
      {expiringSoonGroups.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium" style={{ color: "#e2e8f0" }}>
              Members with Expiring Documents
            </h2>
            <p className="mt-1 text-xs" style={{ color: "#475569" }}>
              Documents expiring within 30 days. Proactive renewal outreach recommended.
            </p>
          </div>
          <div className="space-y-3">
            {expiringSoonGroups.map((group) => (
              <MemberRenewalCard key={`${group.memberType}:${group.profileId}`} group={group} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Member renewal card ───────────────────────────────────────────────────────

function MemberRenewalCard({ group }: { group: MemberRenewalGroup }) {
  const profileHref =
    group.memberType === "company"
      ? `/admin/profiles/companies/${group.profileId}`
      : `/admin/profiles/operators/${group.profileId}`;

  const hasExpired = group.expiredDocs.length > 0;
  const allDocs = [...group.expiredDocs, ...group.expiringSoonDocs];

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        borderColor: hasExpired ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)",
        background: hasExpired ? "rgba(239,68,68,0.02)" : "rgba(249,115,22,0.02)",
      }}
    >
      {/* Member header */}
      <div
        className="flex flex-wrap items-center gap-3 px-5 py-3 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      >
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
          style={
            group.memberType === "company"
              ? { background: "rgba(99,102,241,0.1)", color: "#818cf8" }
              : { background: "rgba(20,184,166,0.1)", color: "#2dd4bf" }
          }
        >
          {group.memberType === "company" ? "Company" : "Operator"}
        </span>

        <Link
          href={profileHref}
          className="text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "#e2e8f0" }}
        >
          {group.memberName}
        </Link>

        {hasExpired && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
          >
            {group.expiredDocs.length} expired
          </span>
        )}
        {group.expiringSoonDocs.length > 0 && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}
          >
            {group.expiringSoonDocs.length} expiring soon
          </span>
        )}

        <Link
          href={profileHref}
          className="ml-auto shrink-0 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "#64748b" }}
        >
          View profile →
        </Link>
      </div>

      {/* Document rows */}
      <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        {allDocs.map((doc) => {
          const isExpired = doc.displayStatus === "expired";
          const overdueDays = Math.abs(doc.daysRemaining);

          return (
            <div
              key={doc.documentType + doc.expirationDate}
              className="flex flex-wrap items-center gap-3 px-5 py-2.5"
            >
              <span
                className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                style={
                  isExpired
                    ? { background: "rgba(239,68,68,0.1)", color: "#f87171" }
                    : { background: "rgba(249,115,22,0.1)", color: "#fb923c" }
                }
              >
                {isExpired ? "Expired" : "Expiring Soon"}
              </span>

              <span className="text-xs font-medium" style={{ color: "#cbd5e1" }}>
                {docLabel(doc.documentType)}
              </span>

              <span className="text-xs" style={{ color: "#64748b" }}>
                {doc.documentTitle}
              </span>

              <span
                className="ml-auto shrink-0 text-[11px] font-medium"
                style={{ color: isExpired ? "#f87171" : "#fb923c" }}
              >
                {isExpired
                  ? `Expired ${fmtDate(doc.expirationDate)} · ${overdueDays}d ago`
                  : `Expires ${fmtDate(doc.expirationDate)} · ${doc.daysRemaining}d`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Outreach action */}
      <div
        className="px-5 py-3 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
      >
        <RenewalOutreachButton
          memberType={group.memberType}
          profileId={group.profileId}
          memberEmail={group.memberEmail}
          isTokenExpired={group.isTokenExpired}
        />
      </div>
    </div>
  );
}
