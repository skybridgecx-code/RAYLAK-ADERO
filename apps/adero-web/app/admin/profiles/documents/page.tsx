import type { Metadata } from "next";
import Link from "next/link";
import {
  aderoCompanyProfiles,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  db,
  type AderoMemberDocument,
} from "@raylak/db";
import {
  daysUntilExpiration,
  getDocumentDisplayStatus,
  getMemberDocumentSummary,
  type AderoMemberType,
} from "~/lib/document-monitoring";
import { MEMBER_DOCUMENT_TYPE_LABELS } from "~/lib/validators";

export const metadata: Metadata = {
  title: "Document Monitoring - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type MemberRef = {
  href: string;
  memberType: AderoMemberType;
  name: string;
  subtitle: string;
};

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function memberPill(memberType: AderoMemberType) {
  return memberType === "company"
    ? { label: "Company", bg: "rgba(99,102,241,0.12)", color: "#818cf8" }
    : { label: "Operator", bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" };
}

function getMemberRef(document: AderoMemberDocument, members: Map<string, MemberRef>) {
  const key =
    document.memberType === "company" ? document.companyProfileId : document.operatorProfileId;
  return key ? (members.get(key) ?? null) : null;
}

export default async function DocumentMonitoringPage() {
  const [companyProfiles, operatorProfiles, documents] = await Promise.all([
    db.select().from(aderoCompanyProfiles),
    db.select().from(aderoOperatorProfiles),
    db.select().from(aderoMemberDocuments),
  ]);

  const memberRefs = new Map<string, MemberRef>();
  const companyDocumentMap = new Map<string, AderoMemberDocument[]>();
  const operatorDocumentMap = new Map<string, AderoMemberDocument[]>();

  for (const profile of companyProfiles) {
    memberRefs.set(profile.id, {
      href: `/admin/profiles/companies/${profile.id}`,
      memberType: "company",
      name: profile.companyName,
      subtitle: `${profile.contactName} · ${profile.email}`,
    });
  }

  for (const profile of operatorProfiles) {
    memberRefs.set(profile.id, {
      href: `/admin/profiles/operators/${profile.id}`,
      memberType: "operator",
      name: profile.fullName,
      subtitle: [profile.city, profile.state].filter(Boolean).join(", ") || profile.email,
    });
  }

  for (const document of documents) {
    if (document.companyProfileId) {
      const existing = companyDocumentMap.get(document.companyProfileId) ?? [];
      existing.push(document);
      companyDocumentMap.set(document.companyProfileId, existing);
    }

    if (document.operatorProfileId) {
      const existing = operatorDocumentMap.get(document.operatorProfileId) ?? [];
      existing.push(document);
      operatorDocumentMap.set(document.operatorProfileId, existing);
    }
  }

  const missingRequired = [
    ...companyProfiles
      .map((profile) => {
        const summary = getMemberDocumentSummary(
          "company",
          companyDocumentMap.get(profile.id) ?? [],
        );
        return {
          href: `/admin/profiles/companies/${profile.id}`,
          memberType: "company" as const,
          name: profile.companyName,
          subtitle: `${profile.contactName} · ${profile.email}`,
          missingTypes: summary.missingRequiredTypes,
        };
      })
      .filter((entry) => entry.missingTypes.length > 0),
    ...operatorProfiles
      .map((profile) => {
        const summary = getMemberDocumentSummary(
          "operator",
          operatorDocumentMap.get(profile.id) ?? [],
        );
        return {
          href: `/admin/profiles/operators/${profile.id}`,
          memberType: "operator" as const,
          name: profile.fullName,
          subtitle: [profile.city, profile.state].filter(Boolean).join(", ") || profile.email,
          missingTypes: summary.missingRequiredTypes,
        };
      })
      .filter((entry) => entry.missingTypes.length > 0),
  ].sort((a, b) => b.missingTypes.length - a.missingTypes.length || a.name.localeCompare(b.name));

  const expiringSoon = documents
    .map((document) => {
      const member = getMemberRef(document, memberRefs);
      if (!member) return null;

      return {
        document,
        member,
        daysRemaining: document.expirationDate
          ? daysUntilExpiration(document.expirationDate)
          : null,
      };
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        !!entry && getDocumentDisplayStatus(entry.document) === "expiring_soon",
    )
    .sort((a, b) => (a.daysRemaining ?? 9999) - (b.daysRemaining ?? 9999));

  const expired = documents
    .map((document) => {
      const member = getMemberRef(document, memberRefs);
      if (!member) return null;

      return {
        document,
        member,
        daysRemaining: document.expirationDate
          ? daysUntilExpiration(document.expirationDate)
          : null,
      };
    })
    .filter(
      (entry): entry is NonNullable<typeof entry> =>
        !!entry && getDocumentDisplayStatus(entry.document) === "expired",
    )
    .sort((a, b) => (a.daysRemaining ?? -9999) - (b.daysRemaining ?? -9999));

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
          Document Monitoring
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Requirement gaps and renewal issues across activated Adero members.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Missing Required
          </p>
          <p className="mt-4 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {missingRequired.length}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Members missing at least one required document
          </p>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Expiring Soon
          </p>
          <p className="mt-4 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {expiringSoon.length}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Document records within 30 days of expiration
          </p>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Expired
          </p>
          <p className="mt-4 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {expired.length}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Document records already expired
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          Missing Required Docs
        </h2>
        {missingRequired.length === 0 ? (
          <p className="text-sm" style={{ color: "#334155" }}>
            No members are currently missing required documents.
          </p>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            {missingRequired.map((entry) => {
              const pill = memberPill(entry.memberType);
              return (
                <Link
                  key={`${entry.memberType}-${entry.href}`}
                  href={entry.href}
                  className="flex items-start gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                  style={{
                    borderColor: "rgba(255,255,255,0.05)",
                    background: "rgba(255,255,255,0.01)",
                  }}
                >
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ background: pill.bg, color: pill.color }}
                  >
                    {pill.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                      {entry.name}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                      {entry.subtitle}
                    </p>
                    <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
                      Missing:{" "}
                      {entry.missingTypes
                        .map((type) => MEMBER_DOCUMENT_TYPE_LABELS[type])
                        .join(", ")}
                    </p>
                  </div>
                  <span style={{ color: "#334155" }}>&rsaquo;</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          Expiring Soon
        </h2>
        {expiringSoon.length === 0 ? (
          <p className="text-sm" style={{ color: "#334155" }}>
            No tracked documents are expiring within 30 days.
          </p>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            {expiringSoon.map(({ document, member, daysRemaining }) => {
              const pill = memberPill(member.memberType);
              return (
                <Link
                  key={document.id}
                  href={member.href}
                  className="flex items-start gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                  style={{
                    borderColor: "rgba(255,255,255,0.05)",
                    background: "rgba(255,255,255,0.01)",
                  }}
                >
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ background: pill.bg, color: pill.color }}
                  >
                    {pill.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                      {document.title}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                      {member.name} ·{" "}
                      {
                        MEMBER_DOCUMENT_TYPE_LABELS[
                          document.documentType as keyof typeof MEMBER_DOCUMENT_TYPE_LABELS
                        ]
                      }
                    </p>
                    <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
                      Expires {fmtDate(document.expirationDate)}
                      {typeof daysRemaining === "number"
                        ? ` · ${daysRemaining} days remaining`
                        : ""}
                    </p>
                  </div>
                  <span style={{ color: "#334155" }}>&rsaquo;</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
          Expired
        </h2>
        {expired.length === 0 ? (
          <p className="text-sm" style={{ color: "#334155" }}>
            No tracked documents are currently expired.
          </p>
        ) : (
          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            {expired.map(({ document, member, daysRemaining }) => {
              const pill = memberPill(member.memberType);
              return (
                <Link
                  key={document.id}
                  href={member.href}
                  className="flex items-start gap-4 border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
                  style={{
                    borderColor: "rgba(255,255,255,0.05)",
                    background: "rgba(255,255,255,0.01)",
                  }}
                >
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                    style={{ background: pill.bg, color: pill.color }}
                  >
                    {pill.label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                      {document.title}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                      {member.name} ·{" "}
                      {
                        MEMBER_DOCUMENT_TYPE_LABELS[
                          document.documentType as keyof typeof MEMBER_DOCUMENT_TYPE_LABELS
                        ]
                      }
                    </p>
                    <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
                      Expired {fmtDate(document.expirationDate)}
                      {typeof daysRemaining === "number"
                        ? ` · ${Math.abs(daysRemaining)} days overdue`
                        : ""}
                    </p>
                  </div>
                  <span style={{ color: "#334155" }}>&rsaquo;</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
