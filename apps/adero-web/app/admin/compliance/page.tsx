import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import {
  aderoCompanyProfiles,
  aderoComplianceAssignments,
  aderoComplianceReviewNotes,
  aderoDocumentComplianceNotifications,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  db,
  type AderoComplianceAssignment,
  type AderoComplianceReviewNote,
  type AderoMemberDocument,
} from "@raylak/db";
import { StatusBadge } from "~/components/status-badge";
import { getCurrentComplianceAction } from "~/lib/document-compliance";
import {
  daysUntilExpiration,
  getDocumentDisplayStatus,
  getMemberDocumentSummary,
  type AderoMemberType,
} from "~/lib/document-monitoring";
import {
  MEMBER_DOCUMENT_TYPE_LABELS,
  type ComplianceEscalationStatus,
  type MemberDocumentComplianceAction,
  type MemberDocumentType,
} from "~/lib/validators";
import { AssignComplianceForm } from "./assign-form";
import { EscalationForm } from "./escalation-form";
import { ReviewNoteForm } from "./review-note-form";

export const metadata: Metadata = {
  title: "Compliance Dashboard - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type IssueKind = "missing" | "expiring_soon" | "expired";

type ComplianceIssue = {
  kind: IssueKind;
  memberType: AderoMemberType;
  profileId: string;
  memberName: string;
  memberSubtitle: string;
  memberHref: string;
  documentType: MemberDocumentType;
  document: AderoMemberDocument | null;
  daysRemaining: number | null;
  latestAction: MemberDocumentComplianceAction | null;
  assignment: AderoComplianceAssignment | null;
  recentNotes: AderoComplianceReviewNote[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value: string | null) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtTimestamp(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function memberPill(memberType: AderoMemberType) {
  return memberType === "company"
    ? { label: "Company", bg: "rgba(99,102,241,0.12)", color: "#818cf8" }
    : { label: "Operator", bg: "rgba(20,184,166,0.12)", color: "#2dd4bf" };
}

function kindLabel(kind: IssueKind) {
  if (kind === "missing") return "Missing";
  if (kind === "expiring_soon") return "Expiring Soon";
  return "Expired";
}

function kindColor(kind: IssueKind) {
  if (kind === "missing") return "#f87171";
  if (kind === "expiring_soon") return "#fb923c";
  return "#ef4444";
}

function isResolved(issue: ComplianceIssue) {
  return issue.latestAction === "resolved";
}

function escalationStatus(issue: ComplianceIssue): ComplianceEscalationStatus {
  return (issue.assignment?.escalationStatus as ComplianceEscalationStatus) ?? "normal";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ComplianceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const ownerFilter = typeof sp["owner"] === "string" ? sp["owner"].trim() : "";
  const stateFilter =
    typeof sp["state"] === "string" && ["open", "resolved", "all"].includes(sp["state"])
      ? (sp["state"] as "open" | "resolved" | "all")
      : "open";
  const escalationFilter =
    typeof sp["escalation"] === "string" &&
    ["all", "escalated", "normal"].includes(sp["escalation"])
      ? (sp["escalation"] as "all" | "escalated" | "normal")
      : "all";

  // ── Load data ────────────────────────────────────────────────────────────────
  const [companyProfiles, operatorProfiles, documents, complianceNotifications, assignments, notes] =
    await Promise.all([
      db.select().from(aderoCompanyProfiles),
      db.select().from(aderoOperatorProfiles),
      db.select().from(aderoMemberDocuments),
      db
        .select()
        .from(aderoDocumentComplianceNotifications)
        .orderBy(desc(aderoDocumentComplianceNotifications.createdAt)),
      db.select().from(aderoComplianceAssignments),
      db
        .select()
        .from(aderoComplianceReviewNotes)
        .orderBy(desc(aderoComplianceReviewNotes.createdAt)),
    ]);

  // ── Build document maps ────────────────────────────────────────────────────
  const companyDocumentMap = new Map<string, AderoMemberDocument[]>();
  const operatorDocumentMap = new Map<string, AderoMemberDocument[]>();

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

  // ── Build assignment + notes lookups ──────────────────────────────────────
  const assignmentMap = new Map<string, AderoComplianceAssignment>();
  for (const assignment of assignments) {
    const profileId =
      assignment.memberType === "company"
        ? assignment.companyProfileId
        : assignment.operatorProfileId;
    if (!profileId) continue;
    const key = `${assignment.memberType}:${profileId}:${assignment.documentType}`;
    assignmentMap.set(key, assignment);
  }

  // notes grouped by issue key → most recent first (already ordered by DESC)
  const notesMap = new Map<string, AderoComplianceReviewNote[]>();
  for (const note of notes) {
    const profileId =
      note.memberType === "company" ? note.companyProfileId : note.operatorProfileId;
    if (!profileId) continue;
    const key = `${note.memberType}:${profileId}:${note.documentType}`;
    const existing = notesMap.get(key) ?? [];
    existing.push(note);
    notesMap.set(key, existing);
  }

  function issueKey(memberType: AderoMemberType, profileId: string, documentType: string) {
    return `${memberType}:${profileId}:${documentType}`;
  }

  function getAssignment(
    memberType: AderoMemberType,
    profileId: string,
    documentType: string,
  ): AderoComplianceAssignment | null {
    return assignmentMap.get(issueKey(memberType, profileId, documentType)) ?? null;
  }

  function getRecentNotes(
    memberType: AderoMemberType,
    profileId: string,
    documentType: string,
  ): AderoComplianceReviewNote[] {
    return (notesMap.get(issueKey(memberType, profileId, documentType)) ?? []).slice(0, 3);
  }

  // ── Build issue list ───────────────────────────────────────────────────────
  const allIssues: ComplianceIssue[] = [];

  for (const profile of companyProfiles) {
    const docs = companyDocumentMap.get(profile.id) ?? [];
    const summary = getMemberDocumentSummary("company", docs);
    for (const documentType of summary.missingRequiredTypes) {
      allIssues.push({
        kind: "missing",
        memberType: "company",
        profileId: profile.id,
        memberName: profile.companyName,
        memberSubtitle: `${profile.contactName} · ${profile.email}`,
        memberHref: `/admin/profiles/companies/${profile.id}`,
        documentType,
        document: null,
        daysRemaining: null,
        latestAction: getCurrentComplianceAction(
          complianceNotifications,
          "company",
          profile.id,
          documentType,
        ),
        assignment: getAssignment("company", profile.id, documentType),
        recentNotes: getRecentNotes("company", profile.id, documentType),
      });
    }
  }

  for (const profile of operatorProfiles) {
    const docs = operatorDocumentMap.get(profile.id) ?? [];
    const summary = getMemberDocumentSummary("operator", docs);
    for (const documentType of summary.missingRequiredTypes) {
      allIssues.push({
        kind: "missing",
        memberType: "operator",
        profileId: profile.id,
        memberName: profile.fullName,
        memberSubtitle:
          [profile.city, profile.state].filter(Boolean).join(", ") || profile.email,
        memberHref: `/admin/profiles/operators/${profile.id}`,
        documentType,
        document: null,
        daysRemaining: null,
        latestAction: getCurrentComplianceAction(
          complianceNotifications,
          "operator",
          profile.id,
          documentType,
        ),
        assignment: getAssignment("operator", profile.id, documentType),
        recentNotes: getRecentNotes("operator", profile.id, documentType),
      });
    }
  }

  for (const document of documents) {
    const displayStatus = getDocumentDisplayStatus(document);
    if (displayStatus !== "expiring_soon" && displayStatus !== "expired") continue;

    const memberType: AderoMemberType =
      document.memberType === "company" ? "company" : "operator";
    const profileId =
      memberType === "company" ? document.companyProfileId : document.operatorProfileId;
    if (!profileId) continue;

    const profile =
      memberType === "company"
        ? companyProfiles.find((p) => p.id === profileId)
        : operatorProfiles.find((p) => p.id === profileId);
    if (!profile) continue;

    const memberName =
      memberType === "company"
        ? (profile as (typeof companyProfiles)[number]).companyName
        : (profile as (typeof operatorProfiles)[number]).fullName;

    const memberSubtitle =
      memberType === "company"
        ? `${(profile as (typeof companyProfiles)[number]).contactName} · ${profile.email}`
        : [
            (profile as (typeof operatorProfiles)[number]).city,
            (profile as (typeof operatorProfiles)[number]).state,
          ]
            .filter(Boolean)
            .join(", ") || profile.email;

    allIssues.push({
      kind: displayStatus,
      memberType,
      profileId,
      memberName,
      memberSubtitle,
      memberHref: `/admin/profiles/${memberType === "company" ? "companies" : "operators"}/${profileId}`,
      documentType: document.documentType as MemberDocumentType,
      document,
      daysRemaining: document.expirationDate ? daysUntilExpiration(document.expirationDate) : null,
      latestAction: getCurrentComplianceAction(
        complianceNotifications,
        memberType,
        profileId,
        document.documentType as MemberDocumentType,
      ),
      assignment: getAssignment(memberType, profileId, document.documentType),
      recentNotes: getRecentNotes(memberType, profileId, document.documentType),
    });
  }

  // ── Summary counts (pre-filter) ────────────────────────────────────────────
  const unresolvedCount = allIssues.filter((i) => !isResolved(i)).length;
  const escalatedCount = allIssues.filter((i) => escalationStatus(i) === "escalated").length;
  const missingCount = allIssues.filter((i) => i.kind === "missing").length;
  const expiringSoonCount = allIssues.filter((i) => i.kind === "expiring_soon").length;
  const expiredCount = allIssues.filter((i) => i.kind === "expired").length;

  // ── Build owner list ───────────────────────────────────────────────────────
  const allOwners = [...new Set(assignments.map((a) => a.assignedTo).filter(Boolean))].sort();

  // ── Apply filters ──────────────────────────────────────────────────────────
  let filtered = allIssues;

  if (stateFilter === "open") {
    filtered = filtered.filter((i) => !isResolved(i));
  } else if (stateFilter === "resolved") {
    filtered = filtered.filter((i) => isResolved(i));
  }

  if (escalationFilter === "escalated") {
    filtered = filtered.filter((i) => escalationStatus(i) === "escalated");
  } else if (escalationFilter === "normal") {
    filtered = filtered.filter((i) => escalationStatus(i) === "normal");
  }

  if (ownerFilter === "unassigned") {
    filtered = filtered.filter((i) => !i.assignment);
  } else if (ownerFilter) {
    filtered = filtered.filter((i) => i.assignment?.assignedTo === ownerFilter);
  }

  // Sort: escalated first → unassigned → kind order
  const kindOrder: Record<IssueKind, number> = { missing: 0, expired: 1, expiring_soon: 2 };
  filtered.sort((a, b) => {
    const escA = escalationStatus(a) === "escalated" ? 0 : 1;
    const escB = escalationStatus(b) === "escalated" ? 0 : 1;
    if (escA !== escB) return escA - escB;
    const assignedA = a.assignment ? 1 : 0;
    const assignedB = b.assignment ? 1 : 0;
    if (assignedA !== assignedB) return assignedA - assignedB;
    return (kindOrder[a.kind] ?? 3) - (kindOrder[b.kind] ?? 3);
  });

  const hasActiveFilters =
    ownerFilter || stateFilter !== "open" || escalationFilter !== "all";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Compliance Dashboard
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#475569" }}>
          Open compliance issues across all activated Adero members. Assign, review, and escalate
          internal work.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Unresolved
          </p>
          <p className="mt-4 text-3xl font-light" style={{ color: "#f1f5f9" }}>
            {unresolvedCount}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            Open compliance issues
          </p>
        </div>

        <div
          className="rounded-xl border p-5"
          style={{
            borderColor:
              escalatedCount > 0 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.07)",
            background:
              escalatedCount > 0 ? "rgba(239,68,68,0.04)" : "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Escalated
          </p>
          <p className="mt-4 text-3xl font-light" style={{ color: escalatedCount > 0 ? "#f87171" : "#f1f5f9" }}>
            {escalatedCount}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            Issues flagged for escalation
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
            Missing Docs
          </p>
          <p className="mt-4 text-3xl font-light" style={{ color: "#f87171" }}>
            {missingCount}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            Required documents not on file
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
          <p className="mt-4 text-3xl font-light" style={{ color: "#fb923c" }}>
            {expiringSoonCount}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            Within 30 days of expiration
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
          <p className="mt-4 text-3xl font-light" style={{ color: "#ef4444" }}>
            {expiredCount}
          </p>
          <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
            Document records past expiration
          </p>
        </div>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            State
          </label>
          <select
            name="state"
            defaultValue={stateFilter}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            Escalation
          </label>
          <select
            name="escalation"
            defaultValue={escalationFilter}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            <option value="all">All</option>
            <option value="escalated">Escalated only</option>
            <option value="normal">Normal only</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium" style={{ color: "#64748b" }}>
            Owner
          </label>
          <select
            name="owner"
            defaultValue={ownerFilter}
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "#1e293b",
              color: "#f1f5f9",
            }}
          >
            <option value="">All owners</option>
            <option value="unassigned">Unassigned</option>
            {allOwners.map((owner) => (
              <option key={owner} value={owner}>
                {owner}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          Filter
        </button>

        {hasActiveFilters && (
          <Link
            href="/admin/compliance"
            className="rounded-lg px-4 py-2 text-sm transition-colors hover:bg-white/5"
            style={{ color: "#64748b" }}
          >
            Clear
          </Link>
        )}
      </form>

      {/* Issue queue */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2
            className="text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Issues
          </h2>
          <span className="text-xs" style={{ color: "#475569" }}>
            {filtered.length} shown
          </span>
        </div>

        {filtered.length === 0 ? (
          <div
            className="rounded-xl border py-16 text-center"
            style={{ borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
          >
            <p className="text-sm">No issues match your filters.</p>
          </div>
        ) : (
          <div
            className="overflow-hidden rounded-xl border divide-y"
            style={{ borderColor: "rgba(255,255,255,0.07)" }}
          >
            {filtered.map((issue) => {
              const pill = memberPill(issue.memberType);
              const key = `${issue.memberType}:${issue.profileId}:${issue.documentType}`;
              const esc = escalationStatus(issue);
              const isEscalated = esc === "escalated";

              return (
                <div
                  key={key}
                  className="px-5 py-5 space-y-4"
                  style={{
                    borderColor: "rgba(255,255,255,0.05)",
                    background: isEscalated
                      ? "rgba(239,68,68,0.03)"
                      : "rgba(255,255,255,0.01)",
                  }}
                >
                  {/* Row 1: member + issue info */}
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                      style={{ background: pill.bg, color: pill.color }}
                    >
                      {pill.label}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={issue.memberHref}
                          className="text-sm font-medium hover:underline"
                          style={{ color: "#f1f5f9" }}
                        >
                          {issue.memberName}
                        </Link>

                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{
                            background: `${kindColor(issue.kind)}18`,
                            color: kindColor(issue.kind),
                          }}
                        >
                          {kindLabel(issue.kind)}
                        </span>

                        {issue.latestAction ? (
                          <StatusBadge status={issue.latestAction} />
                        ) : null}

                        {esc !== "normal" ? <StatusBadge status={esc} /> : null}
                      </div>

                      <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                        {issue.memberSubtitle}
                      </p>

                      <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
                        {MEMBER_DOCUMENT_TYPE_LABELS[issue.documentType]}
                        {issue.kind === "missing" && " · Missing"}
                        {issue.kind === "expiring_soon" && issue.document?.expirationDate
                          ? ` · Expires ${fmtDate(issue.document.expirationDate)}${
                              typeof issue.daysRemaining === "number"
                                ? ` · ${issue.daysRemaining} days`
                                : ""
                            }`
                          : null}
                        {issue.kind === "expired" && issue.document?.expirationDate
                          ? ` · Expired ${fmtDate(issue.document.expirationDate)}${
                              typeof issue.daysRemaining === "number"
                                ? ` · ${Math.abs(issue.daysRemaining)} days overdue`
                                : ""
                            }`
                          : null}
                      </p>
                    </div>

                    <Link href={issue.memberHref} style={{ color: "#334155" }}>
                      &rsaquo;
                    </Link>
                  </div>

                  {/* Row 2: assignment + escalation */}
                  <div
                    className="rounded-lg border px-4 py-3 space-y-3"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.015)",
                    }}
                  >
                    {/* Owner line */}
                    <div className="flex flex-wrap items-center gap-3">
                      <p
                        className="text-[11px] font-semibold uppercase tracking-[2px]"
                        style={{ color: "#475569" }}
                      >
                        Owner
                      </p>
                      {issue.assignment ? (
                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                          {issue.assignment.assignedTo}
                          {issue.assignment.assignedBy
                            ? ` · by ${issue.assignment.assignedBy}`
                            : ""}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: "#475569" }}>
                          Unassigned
                        </span>
                      )}
                    </div>

                    {issue.assignment?.notes ? (
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        {issue.assignment.notes}
                      </p>
                    ) : null}

                    <AssignComplianceForm
                      memberType={issue.memberType}
                      profileId={issue.profileId}
                      documentType={issue.documentType}
                      currentAssignee={issue.assignment?.assignedTo ?? null}
                    />

                    {/* Escalation divider */}
                    <div
                      className="border-t pt-3 space-y-2"
                      style={{ borderColor: "rgba(255,255,255,0.06)" }}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <p
                          className="text-[11px] font-semibold uppercase tracking-[2px]"
                          style={{ color: "#475569" }}
                        >
                          Escalation
                        </p>
                        {esc !== "normal" ? (
                          <>
                            <StatusBadge status={esc} />
                            {issue.assignment?.escalationNote ? (
                              <span className="text-xs" style={{ color: "#64748b" }}>
                                {issue.assignment.escalationNote}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: "#475569" }}>
                            Normal
                          </span>
                        )}
                      </div>

                      <EscalationForm
                        memberType={issue.memberType}
                        profileId={issue.profileId}
                        documentType={issue.documentType}
                        currentStatus={esc}
                      />
                    </div>
                  </div>

                  {/* Row 3: review notes */}
                  <div
                    className="rounded-lg border px-4 py-3 space-y-3"
                    style={{
                      borderColor: "rgba(255,255,255,0.06)",
                      background: "rgba(255,255,255,0.015)",
                    }}
                  >
                    <p
                      className="text-[11px] font-semibold uppercase tracking-[2px]"
                      style={{ color: "#475569" }}
                    >
                      Review Notes
                    </p>

                    {issue.recentNotes.length > 0 ? (
                      <div className="space-y-2">
                        {issue.recentNotes.map((n) => (
                          <div
                            key={n.id}
                            className="rounded-md border px-3 py-2"
                            style={{
                              borderColor: "rgba(255,255,255,0.05)",
                              background: "rgba(255,255,255,0.01)",
                            }}
                          >
                            <p className="text-xs" style={{ color: "#cbd5e1" }}>
                              {n.note}
                            </p>
                            <p className="mt-1 text-[11px]" style={{ color: "#475569" }}>
                              {fmtTimestamp(n.createdAt)}
                              {n.actorName ? ` · ${n.actorName}` : ""}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "#334155" }}>
                        No review notes yet.
                      </p>
                    )}

                    <ReviewNoteForm
                      memberType={issue.memberType}
                      profileId={issue.profileId}
                      documentType={issue.documentType}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="pt-2">
        <Link
          href="/admin/profiles/documents"
          className="text-xs transition-colors"
          style={{ color: "#475569" }}
        >
          → Document Monitoring
        </Link>
      </div>
    </div>
  );
}
