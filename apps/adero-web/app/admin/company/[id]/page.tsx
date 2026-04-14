import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, aderoAuditLogs, aderoCompanyApplications, aderoCompanyProfiles } from "@raylak/db";
import { desc, eq } from "drizzle-orm";
import { StatusBadge } from "~/components/status-badge";
import { AuditHistory } from "../../audit-history";
import { UpdateStatusForm } from "../../update-status-form";
import { AddNoteForm } from "../../add-note-form";
import { ActivateForm } from "../../activate-form";

export const metadata: Metadata = {
  title: "Company Application — Adero Admin",
  robots: { index: false },
};

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex gap-4 border-b py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <dt className="w-40 shrink-0 text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </dt>
      <dd className="text-sm" style={{ color: value != null ? "#cbd5e1" : "#334155" }}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [[app], [profile], auditEntries] = await Promise.all([
    db.select().from(aderoCompanyApplications).where(eq(aderoCompanyApplications.id, id)),
    db.select().from(aderoCompanyProfiles).where(eq(aderoCompanyProfiles.applicationId, id)),
    db
      .select()
      .from(aderoAuditLogs)
      .where(eq(aderoAuditLogs.applicationId, id))
      .orderBy(desc(aderoAuditLogs.createdAt))
      .limit(25),
  ]);

  if (!app) notFound();

  const notes = app.internalNotes
    ? app.internalNotes.split("\n---\n").map((n, i) => ({ key: i, text: n.trim() }))
    : [];

  const isActivated = app.status === "approved" || app.status === "activated";

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/admin" className="text-xs transition-colors" style={{ color: "#475569" }}>
        ← Applications
      </Link>

      {/* Activated banner */}
      {app.status === "activated" && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-4"
          style={{ borderColor: "rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.06)" }}
        >
          <span style={{ color: "#22c55e", fontSize: "1.1rem" }}>✓</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium" style={{ color: "#22c55e" }}>
              Applicant Activated
            </p>
            <p className="text-xs" style={{ color: "#475569" }}>
              Activated {fmt(app.activatedAt)}
              {app.reviewedBy ? ` by ${app.reviewedBy}` : ""}
            </p>
          </div>
          {profile && (
            <Link
              href={`/admin/profiles/companies/${profile.id}`}
              className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{ background: "rgba(34,197,94,0.14)", color: "#22c55e" }}
            >
              Open profile
            </Link>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
              style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
            >
              Company
            </span>
            <StatusBadge status={app.status} />
          </div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
            {app.companyName}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "#475569" }}>
            Submitted {fmt(app.submittedAt)}
            {app.reviewedAt && ` · Last reviewed ${fmt(app.reviewedAt)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Application details — left 2/3 */}
        <div className="space-y-8 lg:col-span-2">
          {/* Company */}
          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Company
            </h2>
            <dl>
              <Row label="Company name" value={app.companyName} />
              <Row label="Website" value={app.website} />
              <Row label="Fleet size" value={app.fleetSize} />
            </dl>
          </section>

          {/* Contact */}
          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Primary Contact
            </h2>
            <dl>
              <Row label="Name" value={`${app.contactFirstName} ${app.contactLastName}`} />
              <Row label="Email" value={app.email} />
              <Row label="Phone" value={app.phone} />
            </dl>
          </section>

          {/* Operations */}
          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Operations
            </h2>
            <dl>
              <Row label="Service markets" value={app.serviceMarkets} />
              <Row label="Overflow needs" value={app.overflowNeeds} />
            </dl>
          </section>

          {/* Notes history */}
          <section>
            <h2
              className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Internal Notes
            </h2>
            {notes.length === 0 ? (
              <p className="text-sm" style={{ color: "#334155" }}>
                No notes yet.
              </p>
            ) : (
              <div className="space-y-3">
                {notes.map((n) => (
                  <div
                    key={n.key}
                    className="whitespace-pre-wrap rounded-lg border px-4 py-3 text-sm"
                    style={{
                      borderColor: "rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#94a3b8",
                    }}
                  >
                    {n.text}
                  </div>
                ))}
              </div>
            )}
          </section>

          <AuditHistory entries={auditEntries} />
        </div>

        {/* Actions sidebar — right 1/3 */}
        <div className="space-y-5">
          {/* Activate CTA — only when status is approved */}
          {app.status === "approved" && <ActivateForm type="company" id={app.id} />}

          {profile && (
            <div
              className="rounded-xl border p-5"
              style={{
                borderColor: "rgba(34,197,94,0.25)",
                background: "rgba(34,197,94,0.04)",
              }}
            >
              <p
                className="mb-2 text-xs font-semibold uppercase tracking-[3px]"
                style={{ color: "#22c55e" }}
              >
                Network Profile
              </p>
              <p className="mb-4 text-xs" style={{ color: "#475569" }}>
                This activated application has a persistent Adero member record.
              </p>
              <Link
                href={`/admin/profiles/companies/${profile.id}`}
                className="inline-flex rounded-lg px-4 py-2 text-sm font-medium"
                style={{ background: "#22c55e", color: "#052e16" }}
              >
                View company profile
              </Link>
            </div>
          )}

          {/* Status + note forms */}
          <div
            className="space-y-5 rounded-xl border p-5"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <UpdateStatusForm type="company" id={app.id} currentStatus={app.status} />
            <hr style={{ borderColor: "rgba(255,255,255,0.07)" }} />
            <AddNoteForm type="company" id={app.id} />
          </div>

          {/* Metadata */}
          <div
            className="space-y-3 rounded-xl border p-5"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <p
              className="mb-1 text-xs font-semibold uppercase tracking-[3px]"
              style={{ color: "#475569" }}
            >
              Record
            </p>
            <p className="text-xs">
              <span className="block" style={{ color: "#334155" }}>
                ID
              </span>
              <span className="break-all font-mono" style={{ color: "#64748b" }}>
                {app.id}
              </span>
            </p>
            <p className="text-xs">
              <span className="block" style={{ color: "#334155" }}>
                Submitted
              </span>
              <span style={{ color: "#64748b" }}>{fmt(app.submittedAt)}</span>
            </p>
            {app.reviewedAt && (
              <p className="text-xs">
                <span className="block" style={{ color: "#334155" }}>
                  Last reviewed
                </span>
                <span style={{ color: "#64748b" }}>
                  {fmt(app.reviewedAt)}
                  {app.reviewedBy ? ` by ${app.reviewedBy}` : ""}
                </span>
              </p>
            )}
            {isActivated && app.activatedAt && (
              <p className="text-xs">
                <span className="block" style={{ color: "#22c55e" }}>
                  Activated
                </span>
                <span style={{ color: "#64748b" }}>{fmt(app.activatedAt)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
