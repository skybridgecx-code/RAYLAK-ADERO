import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, inArray } from "drizzle-orm";
import {
  aderoAuditLogs,
  aderoCompanyApplications,
  aderoCompanyProfiles,
  aderoComplianceAssignments,
  aderoDocumentComplianceNotifications,
  aderoMemberDocuments,
  aderoOperatorApplications,
  aderoOperatorProfiles,
  db,
  type AderoComplianceAssignment,
  type AderoMemberDocument,
} from "@raylak/db";
import { getCurrentComplianceAction } from "~/lib/document-compliance";
import {
  getDocumentDisplayStatus,
  getMemberDocumentSummary,
  type AderoMemberType,
} from "~/lib/document-monitoring";
import {
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type MemberDocumentType,
} from "~/lib/validators";

export const metadata: Metadata = {
  title: "Network Dashboard - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(n: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function countByStatus<T extends { status: string; n: number }>(
  rows: T[],
  status: string,
): number {
  return rows.find((r) => r.status === status)?.n ?? 0;
}

const PORTAL_ACTIONS = ["portal_link_copied", "portal_link_shared", "portal_token_rotated"];

const PORTAL_EVENT_LABELS: Record<string, string> = {
  portal_link_copied: "Link copied",
  portal_link_shared: "Link shared",
  portal_token_rotated: "Token rotated",
};

// ─── Card primitives ──────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
        {label}
      </p>
      <p className="mt-4 text-3xl font-light" style={{ color: accent ?? "#f1f5f9" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[3px]" style={{ color: "#475569" }}>
      {children}
    </h2>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function NetworkDashboardPage() {
  // ── Fetch all data in parallel ───────────────────────────────────────────
  const [
    companyStatusCounts,
    operatorStatusCounts,
    companyAppCounts,
    operatorAppCounts,
    allDocuments,
    companyProfiles,
    operatorProfiles,
    allAssignments,
    allNotifications,
    recentPortalEvents,
  ] = await Promise.all([
    db
      .select({ status: aderoCompanyProfiles.activationStatus, n: count() })
      .from(aderoCompanyProfiles)
      .groupBy(aderoCompanyProfiles.activationStatus),
    db
      .select({ status: aderoOperatorProfiles.activationStatus, n: count() })
      .from(aderoOperatorProfiles)
      .groupBy(aderoOperatorProfiles.activationStatus),
    db
      .select({ status: aderoCompanyApplications.status, n: count() })
      .from(aderoCompanyApplications)
      .groupBy(aderoCompanyApplications.status),
    db
      .select({ status: aderoOperatorApplications.status, n: count() })
      .from(aderoOperatorApplications)
      .groupBy(aderoOperatorApplications.status),
    db.select().from(aderoMemberDocuments),
    db
      .select({ id: aderoCompanyProfiles.id })
      .from(aderoCompanyProfiles),
    db
      .select({ id: aderoOperatorProfiles.id })
      .from(aderoOperatorProfiles),
    db.select().from(aderoComplianceAssignments),
    db
      .select()
      .from(aderoDocumentComplianceNotifications)
      .orderBy(desc(aderoDocumentComplianceNotifications.createdAt)),
    db
      .select()
      .from(aderoAuditLogs)
      .where(inArray(aderoAuditLogs.action, PORTAL_ACTIONS))
      .orderBy(desc(aderoAuditLogs.createdAt))
      .limit(12),
  ]);

  // ── Member counts ────────────────────────────────────────────────────────
  const companyActive = countByStatus(companyStatusCounts, "active");
  const companyPaused = countByStatus(companyStatusCounts, "paused");
  const companyInactive = countByStatus(companyStatusCounts, "inactive");
  const companyTotal = companyActive + companyPaused + companyInactive;

  const operatorActive = countByStatus(operatorStatusCounts, "active");
  const operatorPaused = countByStatus(operatorStatusCounts, "paused");
  const operatorInactive = countByStatus(operatorStatusCounts, "inactive");
  const operatorTotal = operatorActive + operatorPaused + operatorInactive;

  const totalMembers = companyTotal + operatorTotal;
  const totalActive = companyActive + operatorActive;

  // ── Application pipeline ─────────────────────────────────────────────────
  const appPending =
    countByStatus(companyAppCounts, "pending") +
    countByStatus(operatorAppCounts, "pending");
  const appReviewing =
    countByStatus(companyAppCounts, "reviewing") +
    countByStatus(operatorAppCounts, "reviewing");
  const appApproved =
    countByStatus(companyAppCounts, "approved") +
    countByStatus(operatorAppCounts, "approved");
  const appRejected =
    countByStatus(companyAppCounts, "rejected") +
    countByStatus(operatorAppCounts, "rejected");
  const appInPipeline = appPending + appReviewing + appApproved;

  // ── Document health ──────────────────────────────────────────────────────
  const companyDocMap = new Map<string, AderoMemberDocument[]>();
  const operatorDocMap = new Map<string, AderoMemberDocument[]>();

  for (const doc of allDocuments) {
    if (doc.companyProfileId) {
      const existing = companyDocMap.get(doc.companyProfileId) ?? [];
      existing.push(doc);
      companyDocMap.set(doc.companyProfileId, existing);
    }
    if (doc.operatorProfileId) {
      const existing = operatorDocMap.get(doc.operatorProfileId) ?? [];
      existing.push(doc);
      operatorDocMap.set(doc.operatorProfileId, existing);
    }
  }

  let membersWithMissingDocs = 0;
  let membersWithExpiredDocs = 0;
  let membersWithExpiringSoon = 0;
  let docReadyMembers = 0;

  for (const { id } of companyProfiles) {
    const summary = getMemberDocumentSummary("company", companyDocMap.get(id) ?? []);
    if (summary.missingRequiredCount > 0) membersWithMissingDocs++;
    if (summary.expiredCount > 0) membersWithExpiredDocs++;
    if (summary.expiringSoonCount > 0) membersWithExpiringSoon++;
    if (summary.missingRequiredCount === 0 && summary.expiredCount === 0) docReadyMembers++;
  }
  for (const { id } of operatorProfiles) {
    const summary = getMemberDocumentSummary("operator", operatorDocMap.get(id) ?? []);
    if (summary.missingRequiredCount > 0) membersWithMissingDocs++;
    if (summary.expiredCount > 0) membersWithExpiredDocs++;
    if (summary.expiringSoonCount > 0) membersWithExpiringSoon++;
    if (summary.missingRequiredCount === 0 && summary.expiredCount === 0) docReadyMembers++;
  }

  const docIssueTotal = membersWithMissingDocs + membersWithExpiredDocs;

  // ── Compliance health ────────────────────────────────────────────────────
  // Build assignment lookup
  const assignmentMap = new Map<string, AderoComplianceAssignment>();
  for (const a of allAssignments) {
    const profileId =
      a.memberType === "company" ? a.companyProfileId : a.operatorProfileId;
    if (!profileId) continue;
    assignmentMap.set(`${a.memberType}:${profileId}:${a.documentType}`, a);
  }

  // Build issue list (same logic as compliance dashboard)
  type RawIssue = {
    memberType: AderoMemberType;
    profileId: string;
    documentType: MemberDocumentType;
    latestAction: string | null;
    assignment: AderoComplianceAssignment | null;
  };

  const rawIssues: RawIssue[] = [];

  for (const { id } of companyProfiles) {
    const docs = companyDocMap.get(id) ?? [];
    const summary = getMemberDocumentSummary("company", docs);
    for (const documentType of summary.missingRequiredTypes) {
      const latestAction = getCurrentComplianceAction(
        allNotifications,
        "company",
        id,
        documentType,
      );
      rawIssues.push({
        memberType: "company",
        profileId: id,
        documentType,
        latestAction,
        assignment: assignmentMap.get(`company:${id}:${documentType}`) ?? null,
      });
    }
  }

  for (const { id } of operatorProfiles) {
    const docs = operatorDocMap.get(id) ?? [];
    const summary = getMemberDocumentSummary("operator", docs);
    for (const documentType of summary.missingRequiredTypes) {
      const latestAction = getCurrentComplianceAction(
        allNotifications,
        "operator",
        id,
        documentType,
      );
      rawIssues.push({
        memberType: "operator",
        profileId: id,
        documentType,
        latestAction,
        assignment: assignmentMap.get(`operator:${id}:${documentType}`) ?? null,
      });
    }
  }

  for (const doc of allDocuments) {
    const displayStatus = getDocumentDisplayStatus(doc);
    if (displayStatus !== "expiring_soon" && displayStatus !== "expired") continue;

    const memberType: AderoMemberType =
      doc.memberType === "company" ? "company" : "operator";
    const profileId =
      memberType === "company" ? doc.companyProfileId : doc.operatorProfileId;
    if (!profileId) continue;

    const latestAction = getCurrentComplianceAction(
      allNotifications,
      memberType,
      profileId,
      doc.documentType as MemberDocumentType,
    );
    rawIssues.push({
      memberType,
      profileId,
      documentType: doc.documentType as MemberDocumentType,
      latestAction,
      assignment: assignmentMap.get(`${memberType}:${profileId}:${doc.documentType}`) ?? null,
    });
  }

  const totalIssues = rawIssues.length;
  const openIssues = rawIssues.filter((i) => i.latestAction !== "resolved");
  const openCount = openIssues.length;
  const escalatedCount = openIssues.filter(
    (i) => i.assignment?.escalationStatus === "escalated",
  ).length;
  const unassignedCount = openIssues.filter((i) => !i.assignment).length;
  const resolvedCount = totalIssues - openCount;

  // ── Assignment workload ──────────────────────────────────────────────────
  const workload = new Map<string, { open: number; escalated: number }>();
  for (const issue of openIssues) {
    const owner = issue.assignment?.assignedTo ?? "__unassigned__";
    const existing = workload.get(owner) ?? { open: 0, escalated: 0 };
    existing.open++;
    if (issue.assignment?.escalationStatus === "escalated") existing.escalated++;
    workload.set(owner, existing);
  }

  const workloadEntries = [...workload.entries()]
    .filter(([owner]) => owner !== "__unassigned__")
    .sort(([, a], [, b]) => b.open - a.open);
  const unassignedWorkload = workload.get("__unassigned__");

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Network Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Internal health overview for the Adero member network.
        </p>
      </div>

      {/* ── Hero metrics ── */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <MetricCard
          label="Total Members"
          value={totalMembers}
          sub={`${totalActive} active (${pct(totalActive, totalMembers)})`}
        />
        <MetricCard
          label="Open Issues"
          value={openCount}
          sub={`${resolvedCount} resolved · ${totalIssues} total`}
          accent={openCount > 0 ? "#fb923c" : "#f1f5f9"}
        />
        <MetricCard
          label="Escalated"
          value={escalatedCount}
          sub={`${unassignedCount} unassigned`}
          accent={escalatedCount > 0 ? "#f87171" : "#f1f5f9"}
        />
        <MetricCard
          label="Doc Issues"
          value={docIssueTotal}
          sub={`${membersWithMissingDocs} missing · ${membersWithExpiredDocs} expired`}
          accent={docIssueTotal > 0 ? "#f87171" : "#f1f5f9"}
        />
      </div>

      {/* ── Member network ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Member Network</SectionHeader>
          <Link href="/admin/profiles" className="text-xs" style={{ color: "#475569" }}>
            View all →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Companies */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
              >
                Companies
              </span>
              <span className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
                {companyTotal}
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Active", value: companyActive, color: "#22c55e" },
                { label: "Paused", value: companyPaused, color: "#facc15" },
                { label: "Inactive", value: companyInactive, color: "#475569" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: companyTotal > 0 ? pct(value, companyTotal) : "0%",
                        background: color,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs" style={{ color: "#475569" }}>
                    {value} {label}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/admin/profiles/companies"
              className="block text-xs transition-colors hover:opacity-80"
              style={{ color: "#818cf8" }}
            >
              View company profiles →
            </Link>
          </div>

          {/* Operators */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center justify-between">
              <span
                className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                style={{ background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }}
              >
                Operators
              </span>
              <span className="text-2xl font-light" style={{ color: "#f1f5f9" }}>
                {operatorTotal}
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: "Active", value: operatorActive, color: "#22c55e" },
                { label: "Paused", value: operatorPaused, color: "#facc15" },
                { label: "Inactive", value: operatorInactive, color: "#475569" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: operatorTotal > 0 ? pct(value, operatorTotal) : "0%",
                        background: color,
                      }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs" style={{ color: "#475569" }}>
                    {value} {label}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/admin/profiles/operators"
              className="block text-xs transition-colors hover:opacity-80"
              style={{ color: "#2dd4bf" }}
            >
              View operator profiles →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Application pipeline ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Applications Pipeline</SectionHeader>
          <Link href="/admin" className="text-xs" style={{ color: "#475569" }}>
            Review queue →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          {(
            [
              { status: "pending", count: appPending, color: "#818cf8" },
              { status: "reviewing", count: appReviewing, color: "#facc15" },
              { status: "approved", count: appApproved, color: "#fb923c" },
              { status: "rejected", count: appRejected, color: "#64748b" },
            ] as const
          ).map(({ status, count: n, color }) => (
            <Link
              key={status}
              href={`/admin?status=${status}`}
              className="rounded-xl border p-4 transition-colors hover:border-white/20"
              style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
            >
              <p className="text-2xl font-light" style={{ color: n > 0 ? color : "#334155" }}>
                {n}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                {APPLICATION_STATUS_LABELS[status as ApplicationStatus] ?? status}
              </p>
            </Link>
          ))}
        </div>

        {appInPipeline > 0 && (
          <p className="text-xs" style={{ color: "#475569" }}>
            {appInPipeline} application{appInPipeline !== 1 ? "s" : ""} in the pipeline (pending,
            reviewing, or approved).
          </p>
        )}
      </section>

      {/* ── Document health ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Document Health</SectionHeader>
          <Link href="/admin/profiles/documents" className="text-xs" style={{ color: "#475569" }}>
            Document queue →
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-2xl font-light" style={{ color: docReadyMembers > 0 ? "#22c55e" : "#334155" }}>
              {docReadyMembers}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
              Doc-ready members
            </p>
            <p className="mt-1 text-[11px]" style={{ color: "#334155" }}>
              {pct(docReadyMembers, totalMembers)} of network
            </p>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-2xl font-light" style={{ color: membersWithMissingDocs > 0 ? "#f87171" : "#334155" }}>
              {membersWithMissingDocs}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
              Missing required docs
            </p>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-2xl font-light" style={{ color: membersWithExpiringSoon > 0 ? "#fb923c" : "#334155" }}>
              {membersWithExpiringSoon}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
              Expiring within 30 days
            </p>
          </div>

          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-2xl font-light" style={{ color: membersWithExpiredDocs > 0 ? "#ef4444" : "#334155" }}>
              {membersWithExpiredDocs}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
              With expired docs
            </p>
          </div>
        </div>
      </section>

      {/* ── Compliance health + assignment workload ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionHeader>Compliance Health</SectionHeader>
          <Link href="/admin/compliance" className="text-xs" style={{ color: "#475569" }}>
            Compliance dashboard →
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Issue summary */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "#475569" }}>
              Issue State
            </p>
            <div className="space-y-3">
              {[
                {
                  label: "Open issues",
                  value: openCount,
                  color: openCount > 0 ? "#fb923c" : "#334155",
                },
                {
                  label: "Escalated",
                  value: escalatedCount,
                  color: escalatedCount > 0 ? "#f87171" : "#334155",
                },
                {
                  label: "Unassigned",
                  value: unassignedCount,
                  color: unassignedCount > 0 ? "#facc15" : "#334155",
                },
                {
                  label: "Resolved",
                  value: resolvedCount,
                  color: resolvedCount > 0 ? "#22c55e" : "#334155",
                },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "#64748b" }}>
                    {label}
                  </span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            {escalatedCount > 0 && (
              <Link
                href="/admin/compliance?escalation=escalated"
                className="block text-xs transition-colors hover:opacity-80"
                style={{ color: "#f87171" }}
              >
                View escalated issues →
              </Link>
            )}
          </div>

          {/* Assignment workload */}
          <div
            className="rounded-xl border p-5 space-y-4"
            style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
          >
            <p className="text-xs font-semibold" style={{ color: "#475569" }}>
              Assignment Workload
            </p>

            {workloadEntries.length === 0 && !unassignedWorkload ? (
              <p className="text-sm" style={{ color: "#334155" }}>
                No open issues assigned.
              </p>
            ) : (
              <div
                className="overflow-hidden rounded-lg border"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                {workloadEntries.map(([owner, { open, escalated }]) => (
                  <div
                    key={owner}
                    className="flex items-center justify-between border-b px-3 py-2.5 last:border-b-0"
                    style={{
                      borderColor: "rgba(255,255,255,0.05)",
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm" style={{ color: "#cbd5e1" }}>
                        {owner}
                      </p>
                      {escalated > 0 && (
                        <p className="text-[11px]" style={{ color: "#f87171" }}>
                          {escalated} escalated
                        </p>
                      )}
                    </div>
                    <span
                      className="ml-4 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
                      style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
                    >
                      {open}
                    </span>
                  </div>
                ))}

                {unassignedWorkload && (
                  <div
                    className="flex items-center justify-between border-t px-3 py-2.5"
                    style={{
                      borderColor: "rgba(255,255,255,0.05)",
                      background: "rgba(234,179,8,0.03)",
                    }}
                  >
                    <p className="text-sm" style={{ color: "#64748b" }}>
                      Unassigned
                    </p>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
                      style={{ background: "rgba(234,179,8,0.12)", color: "#facc15" }}
                    >
                      {unassignedWorkload.open}
                    </span>
                  </div>
                )}
              </div>
            )}

            {unassignedCount > 0 && (
              <Link
                href="/admin/compliance?owner=unassigned"
                className="block text-xs transition-colors hover:opacity-80"
                style={{ color: "#facc15" }}
              >
                Assign unowned issues →
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Recent portal activity ── */}
      {recentPortalEvents.length > 0 && (
        <section className="space-y-4">
          <SectionHeader>Recent Portal Activity</SectionHeader>

          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            {recentPortalEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 border-b px-4 py-3 last:border-b-0"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <span
                  className="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: "rgba(99,102,241,0.1)", color: "#818cf8" }}
                >
                  {PORTAL_EVENT_LABELS[event.action] ?? event.action.replace(/_/g, " ")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs" style={{ color: "#94a3b8" }}>
                    {event.summary}
                  </p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "#475569" }}>
                    {fmtTimestamp(event.createdAt)}
                    {event.actorName ? ` · ${event.actorName}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Quick links ── */}
      <section className="space-y-3">
        <SectionHeader>Quick Links</SectionHeader>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Application queue", href: "/admin" },
            { label: "Company profiles", href: "/admin/profiles/companies" },
            { label: "Operator profiles", href: "/admin/profiles/operators" },
            { label: "Document monitoring", href: "/admin/profiles/documents" },
            { label: "Compliance dashboard", href: "/admin/compliance" },
            {
              label: "Escalated issues",
              href: "/admin/compliance?escalation=escalated&state=open",
            },
            { label: "Unassigned issues", href: "/admin/compliance?owner=unassigned" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border px-3 py-1.5 text-xs transition-colors hover:border-white/20"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.02)",
                color: "#64748b",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
