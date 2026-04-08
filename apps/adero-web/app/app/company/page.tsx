import { requireAderoUser } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Company Dashboard",
  robots: { index: false },
};

export default async function CompanyDashboardPage() {
  const aderoUser = await requireAderoUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-light tracking-tight" style={{ color: "#f1f5f9" }}>
          Welcome back{aderoUser.firstName ? `, ${aderoUser.firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#64748b" }}>
          Your Adero company dashboard. Manage overflow dispatch and network partnerships.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Active Dispatches
          </p>
          <p className="text-3xl font-bold" style={{ color: "#f1f5f9" }}>0</p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            No active overflow dispatches
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Network Partners
          </p>
          <p className="text-3xl font-bold" style={{ color: "#f1f5f9" }}>0</p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            Partner connections will appear here
          </p>
        </div>

        <div
          className="rounded-xl border p-6"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#6366f1" }}>
            Company Profile
          </p>
          <p className="text-lg font-semibold" style={{ color: "#22c55e" }}>
            {aderoUser.companyProfileId ? "Linked" : "Unlinked"}
          </p>
          <p className="text-xs mt-1" style={{ color: "#475569" }}>
            {aderoUser.companyProfileId
              ? "Your company profile is connected"
              : "No company profile linked yet"}
          </p>
        </div>
      </div>

      <div
        className="mt-8 rounded-xl border p-8 text-center"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
      >
        <p className="text-sm" style={{ color: "#64748b" }}>
          Overflow dispatch and partner management will be available in the next release.
        </p>
      </div>
    </div>
  );
}
