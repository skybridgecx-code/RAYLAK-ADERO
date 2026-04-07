import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  aderoAuditLogs,
  aderoCompanyApplications,
  aderoDocumentComplianceNotifications,
  aderoCompanyProfiles,
  aderoMemberDocuments,
  aderoPortalSubmissions,
  db,
} from "@raylak/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { StatusBadge } from "~/components/status-badge";
import { getMemberDocumentSummary } from "~/lib/document-monitoring";
import { PROFILE_STATUS_LABELS, type ProfileStatus } from "~/lib/validators";
import { AuditHistory } from "../../../audit-history";
import { DocumentTracking } from "../../document-tracking";
import { DetailRow, ProfileShell, fmt } from "../../profile-parts";
import { PortalLinkPanel } from "../../portal-link-panel";
import { PortalSubmissionsPanel } from "../../portal-submissions-panel";

export const metadata: Metadata = {
  title: "Company Profile - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const PORTAL_ACTIONS = ["portal_link_copied", "portal_link_shared", "portal_link_emailed", "portal_token_rotated", "portal_token_expired"];

  const [[row], auditEntries, documents, complianceNotifications, portalEvents, portalSubmissions] =
    await Promise.all([
      db
        .select({
          profile: aderoCompanyProfiles,
          application: aderoCompanyApplications,
        })
        .from(aderoCompanyProfiles)
        .leftJoin(
          aderoCompanyApplications,
          eq(aderoCompanyProfiles.applicationId, aderoCompanyApplications.id),
        )
        .where(eq(aderoCompanyProfiles.id, id)),
      db
        .select()
        .from(aderoAuditLogs)
        .where(eq(aderoAuditLogs.companyProfileId, id))
        .orderBy(desc(aderoAuditLogs.createdAt))
        .limit(25),
      db
        .select()
        .from(aderoMemberDocuments)
        .where(eq(aderoMemberDocuments.companyProfileId, id))
        .orderBy(desc(aderoMemberDocuments.updatedAt)),
      db
        .select()
        .from(aderoDocumentComplianceNotifications)
        .where(eq(aderoDocumentComplianceNotifications.companyProfileId, id))
        .orderBy(desc(aderoDocumentComplianceNotifications.createdAt)),
      db
        .select()
        .from(aderoAuditLogs)
        .where(
          and(
            eq(aderoAuditLogs.companyProfileId, id),
            inArray(aderoAuditLogs.action, PORTAL_ACTIONS),
          ),
        )
        .orderBy(desc(aderoAuditLogs.createdAt))
        .limit(10),
      db
        .select()
        .from(aderoPortalSubmissions)
        .where(eq(aderoPortalSubmissions.companyProfileId, id))
        .orderBy(desc(aderoPortalSubmissions.createdAt)),
    ]);

  if (!row) notFound();

  const { profile, application } = row;
  const profileStatusLabel =
    PROFILE_STATUS_LABELS[profile.activationStatus as ProfileStatus] ?? profile.activationStatus;
  const documentSummary = getMemberDocumentSummary("company", documents);

  return (
    <ProfileShell backHref="/admin/profiles/companies" backLabel="<- Company profiles">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
              style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
            >
              Company Profile
            </span>
            <StatusBadge status={profile.activationStatus} />
          </div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            {profile.companyName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#475569" }}>
            Activated {fmt(profile.activatedAt)}
          </p>
        </div>

        <Link
          href={`/admin/profiles/companies/${profile.id}/edit`}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#6366f1", color: "#fff" }}
        >
          Edit profile
        </Link>

        <Link
          href={`/admin/company/${profile.applicationId}`}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
        >
          Source application
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Company
            </h2>
            <dl>
              <DetailRow label="Profile status" value={profileStatusLabel} />
              <DetailRow label="Company name" value={profile.companyName} />
              <DetailRow label="Website" value={profile.website} />
              <DetailRow label="Fleet size" value={profile.fleetSize} />
              <DetailRow label="Service area" value={profile.serviceArea} />
            </dl>
          </section>

          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Contact
            </h2>
            <dl>
              <DetailRow label="Name" value={profile.contactName} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Phone" value={profile.phone} />
            </dl>
          </section>

          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Service Notes
            </h2>
            {profile.serviceNotes ? (
              <div
                className="whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#94a3b8",
                }}
              >
                {profile.serviceNotes}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#334155" }}>
                No service notes yet.
              </p>
            )}
          </section>

          <DocumentTracking
            documents={documents}
            complianceNotifications={complianceNotifications}
            memberType="company"
            profileId={profile.id}
          />

          <AuditHistory entries={auditEntries} />
        </div>

        <div
          className="h-fit rounded-xl border p-5"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          <p
            className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
            style={{ color: "#475569" }}
          >
            Member Record
          </p>
          <div className="space-y-3 text-xs">
            <p>
              <span className="block" style={{ color: "#334155" }}>
                Profile ID
              </span>
              <span className="break-all font-mono" style={{ color: "#64748b" }}>
                {profile.id}
              </span>
            </p>
            <p>
              <span className="block" style={{ color: "#334155" }}>
                Application ID
              </span>
              <span className="break-all font-mono" style={{ color: "#64748b" }}>
                {profile.applicationId}
              </span>
            </p>
            <p>
              <span className="block" style={{ color: "#334155" }}>
                Source status
              </span>
              <span style={{ color: "#64748b" }}>{application?.status ?? "unknown"}</span>
            </p>
            <p>
              <span className="block" style={{ color: "#334155" }}>
                Tracked documents
              </span>
              <span style={{ color: "#64748b" }}>
                {documents.length} total / {documentSummary.presentRequiredCount}/
                {documentSummary.requiredCount} required present
              </span>
            </p>
            <p>
              <span className="block" style={{ color: "#334155" }}>
                Document issues
              </span>
              <span style={{ color: "#64748b" }}>
                {documentSummary.missingRequiredCount} missing / {documentSummary.expiringSoonCount}{" "}
                expiring soon / {documentSummary.expiredCount} expired
              </span>
            </p>
            <p>
              <span className="block" style={{ color: "#334155" }}>
                Updated
              </span>
              <span style={{ color: "#64748b" }}>{fmt(profile.updatedAt)}</span>
            </p>
          </div>

        </div>

        <PortalLinkPanel
          memberType="company"
          profileId={profile.id}
          memberName={profile.companyName}
          memberEmail={profile.email}
          portalToken={profile.portalToken}
          portalTokenExpiresAt={profile.portalTokenExpiresAt}
          recentEvents={portalEvents}
        />

        <PortalSubmissionsPanel
          submissions={portalSubmissions}
          memberType="company"
          profileId={profile.id}
        />
      </div>
    </ProfileShell>
  );
}
