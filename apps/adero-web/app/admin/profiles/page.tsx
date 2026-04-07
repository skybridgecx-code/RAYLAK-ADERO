import type { Metadata } from "next";
import Link from "next/link";
import { aderoCompanyProfiles, aderoMemberDocuments, aderoOperatorProfiles, db } from "@raylak/db";
import { getDocumentDisplayStatus, getMemberDocumentSummary } from "~/lib/document-monitoring";
import { count } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Activated Members - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [[companyCount], [operatorCount], documents, companyProfiles, operatorProfiles] =
    await Promise.all([
      db.select({ n: count() }).from(aderoCompanyProfiles),
      db.select({ n: count() }).from(aderoOperatorProfiles),
      db.select().from(aderoMemberDocuments),
      db.select({ id: aderoCompanyProfiles.id }).from(aderoCompanyProfiles),
      db.select({ id: aderoOperatorProfiles.id }).from(aderoOperatorProfiles),
    ]);
  const companyDocumentMap = new Map<string, typeof documents>();
  const operatorDocumentMap = new Map<string, typeof documents>();

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

  const companyMissingCount = companyProfiles.filter(
    (profile) =>
      getMemberDocumentSummary("company", companyDocumentMap.get(profile.id) ?? [])
        .missingRequiredCount > 0,
  ).length;
  const operatorMissingCount = operatorProfiles.filter(
    (profile) =>
      getMemberDocumentSummary("operator", operatorDocumentMap.get(profile.id) ?? [])
        .missingRequiredCount > 0,
  ).length;
  const expiringSoonCount = documents.filter(
    (document) => getDocumentDisplayStatus(document) === "expiring_soon",
  ).length;
  const expiredCount = documents.filter(
    (document) => getDocumentDisplayStatus(document) === "expired",
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Activated Members
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Internal Adero network profiles created from activated applications.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/profiles/companies"
          className="rounded-xl border p-6 transition-colors hover:border-indigo-500/40"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
          >
            Companies
          </span>
          <p className="mt-5 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {companyCount?.n ?? 0}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Activated company profiles
          </p>
          <p className="mt-3 text-xs" style={{ color: "#475569" }}>
            {companyMissingCount} with missing required documents
          </p>
        </Link>

        <Link
          href="/admin/profiles/operators"
          className="rounded-xl border p-6 transition-colors hover:border-teal-500/40"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }}
          >
            Operators
          </span>
          <p className="mt-5 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {operatorCount?.n ?? 0}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Activated operator profiles
          </p>
          <p className="mt-3 text-xs" style={{ color: "#475569" }}>
            {operatorMissingCount} with missing required documents
          </p>
        </Link>

        <Link
          href="/admin/profiles/documents"
          className="rounded-xl border p-6 transition-colors hover:border-orange-500/40"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{ background: "rgba(249,115,22,0.12)", color: "#fb923c" }}
          >
            Document Issues
          </span>
          <p className="mt-5 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {companyMissingCount + operatorMissingCount + expiringSoonCount + expiredCount}
          </p>
          <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
            Missing, expiring soon, and expired tracking
          </p>
          <p className="mt-3 text-xs" style={{ color: "#475569" }}>
            {expiringSoonCount} expiring soon · {expiredCount} expired
          </p>
        </Link>
      </div>
    </div>
  );
}
