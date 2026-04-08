import type { Metadata } from "next";
import Link from "next/link";
import { requireAderoRole } from "@/lib/auth";
import { RequestForm } from "@/app/app/requester/request/new/request-form";

export const metadata: Metadata = {
  title: "New Request - Adero",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function NewCompanyRequestPage() {
  await requireAderoRole(["company", "admin"]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/app/company"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "#475569" }}
        >
          ← Dashboard
        </Link>
        <h1
          className="mt-3 text-2xl font-light tracking-tight"
          style={{ color: "#f1f5f9" }}
        >
          New Transportation Request
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Submit a request on behalf of your company. Adero will match you with a suitable operator.
        </p>
      </div>

      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <RequestForm redirectTo="/app/company" />
      </div>
    </div>
  );
}
