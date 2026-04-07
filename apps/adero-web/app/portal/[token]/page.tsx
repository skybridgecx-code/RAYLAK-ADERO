import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import {
  aderoCompanyProfiles,
  aderoDocumentComplianceNotifications,
  aderoMemberDocuments,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import {
  daysUntilExpiration,
  getDocumentDisplayStatus,
  getMemberDocumentSummary,
  type AderoMemberType,
} from "~/lib/document-monitoring";
import {
  MEMBER_DOCUMENT_TYPE_LABELS,
  PROFILE_STATUS_LABELS,
  type MemberDocumentComplianceAction,
  type MemberDocumentDisplayStatus,
  type MemberDocumentType,
  type ProfileStatus,
} from "~/lib/validators";
import { getCurrentComplianceAction } from "~/lib/document-compliance";

export const metadata: Metadata = {
  title: "Member Status - Adero",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const STATUS_DISPLAY: Record<
  MemberDocumentDisplayStatus,
  { label: string; color: string; icon: string }
> = {
  approved: { label: "On File", color: "#4ade80", icon: "✓" },
  pending_review: { label: "Pending Review", color: "#facc15", icon: "⏳" },
  expiring_soon: { label: "Expiring Soon", color: "#fb923c", icon: "⚠" },
  expired: { label: "Expired", color: "#f87171", icon: "✗" },
  missing: { label: "Missing", color: "#f87171", icon: "✗" },
  rejected: { label: "Action Required", color: "#f87171", icon: "✗" },
};

// Actions that warrant a member-visible notice (without exposing internal detail)
const FOLLOW_UP_ACTIONS: MemberDocumentComplianceAction[] = ["follow_up_needed", "reminder_sent"];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MemberPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token format before querying
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(token)) notFound();

  // ── Resolve member by portal token ───────────────────────────────────────
  const [companyRow, operatorRow] = await Promise.all([
    db
      .select()
      .from(aderoCompanyProfiles)
      .where(eq(aderoCompanyProfiles.portalToken, token))
      .limit(1),
    db
      .select()
      .from(aderoOperatorProfiles)
      .where(eq(aderoOperatorProfiles.portalToken, token))
      .limit(1),
  ]);

  const companyProfile = companyRow[0] ?? null;
  const operatorProfile = operatorRow[0] ?? null;

  if (!companyProfile && !operatorProfile) notFound();

  const memberType: AderoMemberType = companyProfile ? "company" : "operator";
  const profileId = companyProfile ? companyProfile.id : operatorProfile!.id;
  const memberName = companyProfile ? companyProfile.companyName : operatorProfile!.fullName;
  const activationStatus = companyProfile
    ? companyProfile.activationStatus
    : operatorProfile!.activationStatus;
  const memberLabel = companyProfile ? "Company" : "Operator";
  const memberColor = companyProfile ? "#818cf8" : "#2dd4bf";
  const memberBg = companyProfile ? "rgba(99,102,241,0.12)" : "rgba(20,184,166,0.12)";

  // ── Load documents + compliance notifications ────────────────────────────
  const [documents, complianceNotifications] = await Promise.all([
    companyProfile
      ? db
          .select()
          .from(aderoMemberDocuments)
          .where(eq(aderoMemberDocuments.companyProfileId, profileId))
          .orderBy(desc(aderoMemberDocuments.updatedAt))
      : db
          .select()
          .from(aderoMemberDocuments)
          .where(eq(aderoMemberDocuments.operatorProfileId, profileId))
          .orderBy(desc(aderoMemberDocuments.updatedAt)),
    companyProfile
      ? db
          .select()
          .from(aderoDocumentComplianceNotifications)
          .where(eq(aderoDocumentComplianceNotifications.companyProfileId, profileId))
          .orderBy(desc(aderoDocumentComplianceNotifications.createdAt))
      : db
          .select()
          .from(aderoDocumentComplianceNotifications)
          .where(eq(aderoDocumentComplianceNotifications.operatorProfileId, profileId))
          .orderBy(desc(aderoDocumentComplianceNotifications.createdAt)),
  ]);

  // ── Derive document status summary ───────────────────────────────────────
  const summary = getMemberDocumentSummary(memberType, documents);
  const profileStatusLabel =
    PROFILE_STATUS_LABELS[activationStatus as ProfileStatus] ?? activationStatus;

  // Required document status per type
  const requiredDocStatus = summary.requiredDocuments.map(({ documentType, document }) => {
    const displayStatus: MemberDocumentDisplayStatus = document
      ? getDocumentDisplayStatus(document)
      : "missing";

    const daysRemaining =
      document?.expirationDate ? daysUntilExpiration(document.expirationDate) : null;

    const complianceAction = getCurrentComplianceAction(
      complianceNotifications,
      memberType,
      profileId,
      documentType,
    );

    const needsFollowUp = FOLLOW_UP_ACTIONS.includes(
      complianceAction as MemberDocumentComplianceAction,
    );

    return {
      documentType,
      document,
      displayStatus,
      daysRemaining,
      needsFollowUp,
    };
  });

  // Collect document types needing member attention (for notice block)
  const attentionTypes = requiredDocStatus
    .filter(
      (entry) =>
        entry.needsFollowUp ||
        entry.displayStatus === "missing" ||
        entry.displayStatus === "expired" ||
        entry.displayStatus === "expiring_soon",
    )
    .map((entry) => MEMBER_DOCUMENT_TYPE_LABELS[entry.documentType as MemberDocumentType]);

  const isAccountPaused = activationStatus === "paused";
  const isAccountInactive = activationStatus === "inactive";
  const allRequiredPresent = summary.missingRequiredCount === 0 && summary.expiredCount === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{ background: memberBg, color: memberColor }}
          >
            {memberLabel}
          </span>
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={
              activationStatus === "active"
                ? { background: "rgba(34,197,94,0.2)", color: "#22c55e" }
                : activationStatus === "paused"
                  ? { background: "rgba(234,179,8,0.15)", color: "#facc15" }
                  : { background: "rgba(148,163,184,0.15)", color: "#94a3b8" }
            }
          >
            {profileStatusLabel}
          </span>
        </div>

        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          {memberName}
        </h1>

        <p className="text-sm" style={{ color: "#475569" }}>
          Your current document and compliance status with Adero.
        </p>
      </div>

      {/* Account notices */}
      {isAccountPaused && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{ borderColor: "rgba(234,179,8,0.3)", background: "rgba(234,179,8,0.06)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#facc15" }}>
            Your account is currently paused.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#94a3b8" }}>
            Please contact your Adero representative for more information.
          </p>
        </div>
      )}

      {isAccountInactive && (
        <div
          className="rounded-xl border px-5 py-4"
          style={{ borderColor: "rgba(148,163,184,0.2)", background: "rgba(148,163,184,0.04)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            Your account is inactive.
          </p>
          <p className="mt-1 text-xs" style={{ color: "#475569" }}>
            Please contact your Adero representative for more information.
          </p>
        </div>
      )}

      {/* Overall status banner */}
      {!isAccountInactive && (
        <div
          className="rounded-xl border px-5 py-4"
          style={
            allRequiredPresent
              ? { borderColor: "rgba(34,197,94,0.2)", background: "rgba(34,197,94,0.05)" }
              : { borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }
          }
        >
          {allRequiredPresent ? (
            <>
              <p className="text-sm font-medium" style={{ color: "#4ade80" }}>
                Your document file is in good standing.
              </p>
              <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                {summary.expiringSoonCount > 0
                  ? `${summary.expiringSoonCount} document${summary.expiringSoonCount > 1 ? "s" : ""} expiring soon — see below for details.`
                  : "All required documents are on file and current."}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium" style={{ color: "#f87171" }}>
                Action required: {summary.missingRequiredCount + summary.expiredCount} document
                {summary.missingRequiredCount + summary.expiredCount > 1 ? "s" : ""} need
                {summary.missingRequiredCount + summary.expiredCount === 1 ? "s" : ""} attention.
              </p>
              <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                Please review the requirements below and contact your Adero representative.
              </p>
            </>
          )}
        </div>
      )}

      {/* Follow-up notice */}
      {attentionTypes.length > 0 && (
        <div
          className="rounded-xl border px-5 py-4 space-y-1"
          style={{ borderColor: "rgba(249,115,22,0.25)", background: "rgba(249,115,22,0.04)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#fb923c" }}>
            Documentation follow-up requested
          </p>
          <p className="text-xs" style={{ color: "#94a3b8" }}>
            The following document{attentionTypes.length > 1 ? "s require" : " requires"} your
            attention:{" "}
            <span style={{ color: "#cbd5e1" }}>{attentionTypes.join(", ")}</span>.
          </p>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Please contact your Adero representative to submit the required documentation.
          </p>
        </div>
      )}

      {/* Required documents table */}
      <section className="space-y-4">
        <h2
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#475569" }}
        >
          Required Documents
        </h2>

        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {requiredDocStatus.map((entry, idx) => {
            const statusDisplay = STATUS_DISPLAY[entry.displayStatus] ?? {
              label: entry.displayStatus,
              color: "#94a3b8",
              icon: "–",
            };
            const docTypeLabel =
              MEMBER_DOCUMENT_TYPE_LABELS[entry.documentType as MemberDocumentType] ??
              entry.documentType;

            return (
              <div
                key={entry.documentType}
                className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
                style={{
                  borderColor: "rgba(255,255,255,0.05)",
                  background:
                    idx % 2 === 0 ? "rgba(255,255,255,0.01)" : "rgba(255,255,255,0.005)",
                }}
              >
                {/* Status icon */}
                <span
                  className="shrink-0 text-base"
                  style={{ color: statusDisplay.color, minWidth: "1.25rem", textAlign: "center" }}
                >
                  {statusDisplay.icon}
                </span>

                {/* Document info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
                    {docTypeLabel}
                  </p>

                  {entry.document ? (
                    <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                      {entry.document.title}
                    </p>
                  ) : null}
                </div>

                {/* Status + expiry */}
                <div className="shrink-0 text-right space-y-1">
                  <p className="text-xs font-semibold" style={{ color: statusDisplay.color }}>
                    {statusDisplay.label}
                  </p>

                  {entry.document?.expirationDate ? (
                    <p className="text-[11px]" style={{ color: "#475569" }}>
                      {entry.displayStatus === "expired"
                        ? `Expired ${fmtDate(entry.document.expirationDate)}`
                        : entry.displayStatus === "expiring_soon"
                          ? `Expires ${fmtDate(entry.document.expirationDate)}${
                              typeof entry.daysRemaining === "number"
                                ? ` · ${entry.daysRemaining} day${entry.daysRemaining === 1 ? "" : "s"}`
                                : ""
                            }`
                          : `Expires ${fmtDate(entry.document.expirationDate)}`}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Additional tracked documents (non-required) */}
      {(() => {
        const requiredTypes = new Set(summary.requiredTypes);
        const additional = documents.filter(
          (d) => !requiredTypes.has(d.documentType as MemberDocumentType),
        );
        if (additional.length === 0) return null;

        return (
          <section className="space-y-4">
            <h2
              className="text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Additional Documents on File
            </h2>
            <div
              className="overflow-hidden rounded-xl border"
              style={{ borderColor: "rgba(255,255,255,0.07)" }}
            >
              {additional.map((doc) => {
                const displayStatus = getDocumentDisplayStatus(doc);
                const statusDisplay = STATUS_DISPLAY[displayStatus] ?? {
                  label: displayStatus,
                  color: "#94a3b8",
                  icon: "–",
                };
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 border-b px-5 py-4 last:border-b-0"
                    style={{
                      borderColor: "rgba(255,255,255,0.05)",
                      background: "rgba(255,255,255,0.01)",
                    }}
                  >
                    <span
                      className="shrink-0 text-base"
                      style={{
                        color: statusDisplay.color,
                        minWidth: "1.25rem",
                        textAlign: "center",
                      }}
                    >
                      {statusDisplay.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm" style={{ color: "#f1f5f9" }}>
                        {doc.title}
                      </p>
                      <p className="mt-0.5 text-xs" style={{ color: "#475569" }}>
                        {MEMBER_DOCUMENT_TYPE_LABELS[doc.documentType as MemberDocumentType] ??
                          doc.documentType}
                      </p>
                    </div>

                    <p className="shrink-0 text-xs font-semibold" style={{ color: statusDisplay.color }}>
                      {statusDisplay.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Contact reminder */}
      <div
        className="rounded-xl border px-5 py-4"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}
      >
        <p className="text-sm font-medium" style={{ color: "#f1f5f9" }}>
          Need to submit documents or ask a question?
        </p>
        <p className="mt-1 text-xs" style={{ color: "#475569" }}>
          Contact your Adero representative directly. Do not reply to automated messages.
        </p>
      </div>
    </div>
  );
}
