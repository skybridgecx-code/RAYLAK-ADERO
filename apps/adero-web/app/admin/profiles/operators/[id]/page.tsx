import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  aderoAuditLogs,
  aderoDocumentComplianceNotifications,
  aderoMemberDocuments,
  aderoOperatorApplications,
  aderoOperatorProfiles,
  db,
} from "@raylak/db";
import { desc, eq } from "drizzle-orm";
import { StatusBadge } from "~/components/status-badge";
import { getMemberDocumentSummary } from "~/lib/document-monitoring";
import {
  PROFILE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  type ProfileStatus,
  type VehicleType,
} from "~/lib/validators";
import { AuditHistory } from "../../../audit-history";
import { DocumentTracking } from "../../document-tracking";
import { DetailRow, ProfileShell, fmt } from "../../profile-parts";

export const metadata: Metadata = {
  title: "Operator Profile - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function OperatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[row], auditEntries, documents, complianceNotifications] = await Promise.all([
    db
      .select({
        profile: aderoOperatorProfiles,
        application: aderoOperatorApplications,
      })
      .from(aderoOperatorProfiles)
      .leftJoin(
        aderoOperatorApplications,
        eq(aderoOperatorProfiles.applicationId, aderoOperatorApplications.id),
      )
      .where(eq(aderoOperatorProfiles.id, id)),
    db
      .select()
      .from(aderoAuditLogs)
      .where(eq(aderoAuditLogs.operatorProfileId, id))
      .orderBy(desc(aderoAuditLogs.createdAt))
      .limit(25),
    db
      .select()
      .from(aderoMemberDocuments)
      .where(eq(aderoMemberDocuments.operatorProfileId, id))
      .orderBy(desc(aderoMemberDocuments.updatedAt)),
    db
      .select()
      .from(aderoDocumentComplianceNotifications)
      .where(eq(aderoDocumentComplianceNotifications.operatorProfileId, id))
      .orderBy(desc(aderoDocumentComplianceNotifications.createdAt)),
  ]);

  if (!row) notFound();

  const { profile, application } = row;
  const location = [profile.city, profile.state].filter(Boolean).join(", ");
  const vehicleLabel =
    VEHICLE_TYPE_LABELS[profile.vehicleType as VehicleType] ?? profile.vehicleType;
  const profileStatusLabel =
    PROFILE_STATUS_LABELS[profile.activationStatus as ProfileStatus] ?? profile.activationStatus;
  const documentSummary = getMemberDocumentSummary("operator", documents);

  return (
    <ProfileShell backHref="/admin/profiles/operators" backLabel="<- Operator profiles">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
              style={{ background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }}
            >
              Operator Profile
            </span>
            <StatusBadge status={profile.activationStatus} />
          </div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            {profile.fullName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#475569" }}>
            {location || "Region pending"} - Activated {fmt(profile.activatedAt)}
          </p>
        </div>

        <Link
          href={`/admin/profiles/operators/${profile.id}/edit`}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#14b8a6", color: "#042f2e" }}
        >
          Edit profile
        </Link>

        <Link
          href={`/admin/operator/${profile.applicationId}`}
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "rgba(20,184,166,0.12)", color: "#2dd4bf" }}
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
              Operator
            </h2>
            <dl>
              <DetailRow label="Profile status" value={profileStatusLabel} />
              <DetailRow label="Full name" value={profile.fullName} />
              <DetailRow label="City" value={profile.city} />
              <DetailRow label="State" value={profile.state} />
              <DetailRow label="Email" value={profile.email} />
              <DetailRow label="Phone" value={profile.phone} />
            </dl>
          </section>

          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Vehicle And Service
            </h2>
            <dl>
              <DetailRow label="Vehicle type" value={vehicleLabel} />
              <DetailRow label="Vehicle year" value={profile.vehicleYear} />
              <DetailRow label="Years of experience" value={profile.yearsExperience} />
            </dl>
            {profile.serviceNotes ? (
              <div
                className="mt-4 whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm"
                style={{
                  borderColor: "rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  color: "#94a3b8",
                }}
              >
                {profile.serviceNotes}
              </div>
            ) : (
              <p className="mt-4 text-sm" style={{ color: "#334155" }}>
                No service notes yet.
              </p>
            )}
          </section>

          <DocumentTracking
            documents={documents}
            complianceNotifications={complianceNotifications}
            memberType="operator"
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
      </div>
    </ProfileShell>
  );
}
