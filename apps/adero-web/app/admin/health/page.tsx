import type { Metadata } from "next";
import {
  getAderoAdminCronDistinctStatus,
  isAderoAdminSecretConfigured,
  requireAderoAdminPage,
  type SecretDistinctStatus,
} from "@/lib/admin-auth";
import { isStorageConfigured } from "~/lib/s3";

export const metadata: Metadata = {
  title: "System Health - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

type ReadinessStatus = "yes" | "no" | "unknown";
type RowMode = "status" | "text";

type HealthRow = {
  label: string;
  mode: RowMode;
  value: string;
  detail: string;
  status?: ReadinessStatus;
};

function toYesNo(value: boolean): ReadinessStatus {
  return value ? "yes" : "no";
}

function statusColor(status: ReadinessStatus) {
  if (status === "yes") {
    return {
      background: "rgba(34,197,94,0.16)",
      color: "#4ade80",
      borderColor: "rgba(34,197,94,0.35)",
    };
  }
  if (status === "no") {
    return {
      background: "rgba(239,68,68,0.16)",
      color: "#f87171",
      borderColor: "rgba(239,68,68,0.35)",
    };
  }
  return {
    background: "rgba(148,163,184,0.15)",
    color: "#cbd5e1",
    borderColor: "rgba(148,163,184,0.3)",
  };
}

function StatusBadge({ status }: { status: ReadinessStatus }) {
  const styles = statusColor(status);

  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={styles}
    >
      {status}
    </span>
  );
}

export default async function AdminHealthPage() {
  await requireAderoAdminPage("/admin/health");

  const environment = process.env["NODE_ENV"] === "production" ? "production" : "development";
  const aderoBaseUrlConfigured = Boolean(process.env["ADERO_BASE_URL"]);
  const databaseUrlConfigured = Boolean(process.env["DATABASE_URL"]);
  const clerkPublishableConfigured = Boolean(process.env["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]);
  const clerkSecretConfigured = Boolean(process.env["CLERK_SECRET_KEY"]);
  const adminSecretConfigured = isAderoAdminSecretConfigured();
  const cronSecretConfigured = Boolean(process.env["ADERO_CRON_SECRET"]);
  const adminCronDistinct = getAderoAdminCronDistinctStatus();
  const stripeConfigured = Boolean(
    process.env["STRIPE_SECRET_KEY"] &&
      process.env["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"] &&
      process.env["STRIPE_WEBHOOK_SECRET"] &&
      process.env["STRIPE_CONNECT_WEBHOOK_SECRET"],
  );
  const resendEmailConfigured = Boolean(
    process.env["RESEND_API_KEY"] && process.env["ADERO_FROM_EMAIL"],
  );
  const storageConfigured = isStorageConfigured();
  const fileAttachmentState = storageConfigured ? "Enabled" : "Deferred";
  const fileAttachmentDetail = storageConfigured
    ? "Portal file attachments and admin downloads are available."
    : "Deferred — portal submissions work, file attachments are unavailable until AWS/S3 is configured.";

  const distinctValueByStatus: Record<SecretDistinctStatus, string> = {
    yes: "Yes",
    no: "No",
    unknown: "Unknown",
  };

  const rows: HealthRow[] = [
    {
      label: "App",
      mode: "text",
      value: "Adero",
      detail: "Admin status and deployment-readiness view.",
    },
    {
      label: "Environment",
      mode: "text",
      value: environment,
      detail: "Derived from NODE_ENV.",
    },
    {
      label: "Adero base URL configured",
      mode: "status",
      status: toYesNo(aderoBaseUrlConfigured),
      value: aderoBaseUrlConfigured ? "Yes" : "No",
      detail: aderoBaseUrlConfigured
        ? "ADERO_BASE_URL is set."
        : "ADERO_BASE_URL is missing.",
    },
    {
      label: "Database URL configured",
      mode: "status",
      status: toYesNo(databaseUrlConfigured),
      value: databaseUrlConfigured ? "Yes" : "No",
      detail: databaseUrlConfigured ? "DATABASE_URL is set." : "DATABASE_URL is missing.",
    },
    {
      label: "Clerk publishable key configured",
      mode: "status",
      status: toYesNo(clerkPublishableConfigured),
      value: clerkPublishableConfigured ? "Yes" : "No",
      detail: clerkPublishableConfigured
        ? "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set."
        : "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing.",
    },
    {
      label: "Clerk secret key configured",
      mode: "status",
      status: toYesNo(clerkSecretConfigured),
      value: clerkSecretConfigured ? "Yes" : "No",
      detail: clerkSecretConfigured ? "CLERK_SECRET_KEY is set." : "CLERK_SECRET_KEY is missing.",
    },
    {
      label: "Admin secret configured",
      mode: "status",
      status: toYesNo(adminSecretConfigured),
      value: adminSecretConfigured ? "Yes" : "No",
      detail: adminSecretConfigured
        ? "ADERO_ADMIN_SECRET is set."
        : "ADERO_ADMIN_SECRET is missing.",
    },
    {
      label: "Cron secret configured",
      mode: "status",
      status: toYesNo(cronSecretConfigured),
      value: cronSecretConfigured ? "Yes" : "No",
      detail: cronSecretConfigured
        ? "ADERO_CRON_SECRET is set."
        : "ADERO_CRON_SECRET is missing.",
    },
    {
      label: "Admin/Cron secrets are distinct",
      mode: "status",
      status: adminCronDistinct,
      value: distinctValueByStatus[adminCronDistinct],
      detail:
        adminCronDistinct === "yes"
          ? "ADERO_ADMIN_SECRET and ADERO_CRON_SECRET are different."
          : adminCronDistinct === "no"
            ? "ADERO_ADMIN_SECRET and ADERO_CRON_SECRET are currently the same."
            : "Cannot determine until both secrets are configured.",
    },
    {
      label: "Stripe configured",
      mode: "status",
      status: toYesNo(stripeConfigured),
      value: stripeConfigured ? "Yes" : "No",
      detail: stripeConfigured
        ? "Stripe keys and webhook secrets are present."
        : "One or more Stripe keys or webhook secrets are missing.",
    },
    {
      label: "Resend/email configured",
      mode: "status",
      status: toYesNo(resendEmailConfigured),
      value: resendEmailConfigured ? "Yes" : "No",
      detail: resendEmailConfigured
        ? "RESEND_API_KEY and ADERO_FROM_EMAIL are set."
        : "RESEND_API_KEY or ADERO_FROM_EMAIL is missing.",
    },
    {
      label: "AWS/S3 storage configured",
      mode: "status",
      status: toYesNo(storageConfigured),
      value: storageConfigured ? "Yes" : "No",
      detail: storageConfigured
        ? "AWS/S3 storage values are configured."
        : "AWS/S3 storage is currently deferred.",
    },
    {
      label: "File attachments",
      mode: "text",
      value: fileAttachmentState,
      detail: fileAttachmentDetail,
    },
  ];

  const nextSteps: string[] = [];

  if (!storageConfigured) {
    nextSteps.push(
      "AWS/S3 remains deferred. Follow docs/ADERO_DEFERRED_AWS_STORAGE.md before enabling attachment uploads/downloads.",
    );
  }

  if (!cronSecretConfigured) {
    nextSteps.push("Set ADERO_CRON_SECRET in production, then redeploy.");
  }

  if (!aderoBaseUrlConfigured) {
    nextSteps.push("Set ADERO_BASE_URL to https://adero-disp.vercel.app, then redeploy.");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Adero System Health
        </h1>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Safe configuration readiness checks for production operations. Secret values are never
          displayed.
        </p>
      </div>

      <section
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        <div
          className="grid grid-cols-[minmax(220px,280px)_120px_1fr] gap-4 border-b px-5 py-3 text-xs font-semibold uppercase tracking-[2px]"
          style={{ borderColor: "rgba(255,255,255,0.06)", color: "#475569" }}
        >
          <span>Check</span>
          <span>Status</span>
          <span>Notes</span>
        </div>

        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {rows.map((row) => (
            <div key={row.label} className="grid grid-cols-[minmax(220px,280px)_120px_1fr] gap-4 px-5 py-3">
              <p className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
                {row.label}
              </p>
              <div className="text-sm">
                {row.mode === "status" && row.status ? (
                  <StatusBadge status={row.status} />
                ) : (
                  <span style={{ color: "#cbd5e1" }}>{row.value}</span>
                )}
              </div>
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                {row.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        className="rounded-xl border p-5"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        <h2
          className="text-xs font-semibold uppercase tracking-[3px]"
          style={{ color: "#475569" }}
        >
          What To Do Next
        </h2>
        {nextSteps.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-4">
            {nextSteps.map((step) => (
              <li key={step} className="text-sm" style={{ color: "#cbd5e1" }}>
                {step}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm" style={{ color: "#cbd5e1" }}>
            No immediate action required. Continue standard deploy and smoke-check workflow.
          </p>
        )}
      </section>
    </div>
  );
}
