import type { Metadata } from "next";
import Link from "next/link";
import { aderoCompanyProfiles, aderoOperatorProfiles, db } from "@raylak/db";
import { count, eq } from "drizzle-orm";

export const metadata: Metadata = {
  title: "Activated Members - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilesPage() {
  const [[companyCount], [operatorCount]] = await Promise.all([
    db
      .select({ n: count() })
      .from(aderoCompanyProfiles)
      .where(eq(aderoCompanyProfiles.activationStatus, "activated")),
    db
      .select({ n: count() })
      .from(aderoOperatorProfiles)
      .where(eq(aderoOperatorProfiles.activationStatus, "activated")),
  ]);

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

      <div className="grid gap-4 md:grid-cols-2">
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
        </Link>
      </div>
    </div>
  );
}
