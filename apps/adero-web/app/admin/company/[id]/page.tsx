import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, aderoCompanyApplications } from "@raylak/db";
import { eq } from "drizzle-orm";
import { StatusBadge } from "~/components/status-badge";
import { UpdateStatusForm } from "../../update-status-form";
import { AddNoteForm } from "../../add-note-form";

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
    <div className="flex gap-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <dt className="w-40 shrink-0 text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </dt>
      <dd className="text-sm" style={{ color: value ? "#cbd5e1" : "#334155" }}>
        {value ?? "—"}
      </dd>
    </div>
  );
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [app] = await db
    .select()
    .from(aderoCompanyApplications)
    .where(eq(aderoCompanyApplications.id, id));

  if (!app) notFound();

  const notes = app.internalNotes
    ? app.internalNotes.split("\n---\n").map((n, i) => ({ key: i, text: n.trim() }))
    : [];

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link href="/admin" className="text-xs transition-colors" style={{ color: "#475569" }}>
        ← Applications
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
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
          <p className="text-sm mt-1" style={{ color: "#475569" }}>
            Submitted {fmt(app.submittedAt)}
            {app.reviewedAt && ` · Reviewed ${fmt(app.reviewedAt)}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Application details — left 2/3 */}
        <div className="lg:col-span-2 space-y-8">
          {/* Company */}
          <section>
            <h2
              className="text-xs font-semibold uppercase tracking-[3px] mb-4"
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
              className="text-xs font-semibold uppercase tracking-[3px] mb-4"
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
              className="text-xs font-semibold uppercase tracking-[3px] mb-4"
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
              className="text-xs font-semibold uppercase tracking-[3px] mb-4"
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
                    className="rounded-lg border px-4 py-3 text-sm whitespace-pre-wrap"
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
        </div>

        {/* Actions sidebar — right 1/3 */}
        <div className="space-y-6">
          <div
            className="rounded-xl border p-5 space-y-5"
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
            className="rounded-xl border p-5 space-y-2"
            style={{
              borderColor: "rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[3px] mb-3" style={{ color: "#475569" }}>
              Record
            </p>
            <p className="text-xs" style={{ color: "#475569" }}>
              <span style={{ color: "#334155" }}>ID</span>
              <br />
              <span className="font-mono text-xs break-all" style={{ color: "#64748b" }}>
                {app.id}
              </span>
            </p>
            <p className="text-xs" style={{ color: "#475569" }}>
              <span style={{ color: "#334155" }}>Submitted</span>
              <br />
              {fmt(app.submittedAt)}
            </p>
            {app.reviewedAt && (
              <p className="text-xs" style={{ color: "#475569" }}>
                <span style={{ color: "#334155" }}>Last reviewed</span>
                <br />
                {fmt(app.reviewedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
