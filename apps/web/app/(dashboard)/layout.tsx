import type { Metadata } from "next";
import { requireRole } from "~/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "Operator Dashboard",
    template: "%s | RAYLAK Dashboard",
  },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate: dispatcher, admin, or owner only
  await requireRole(["dispatcher", "admin", "owner"]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar navigation added in Phase 2 */}
      <div className="flex flex-1 flex-col">
        {/* Dashboard topbar added in Phase 2 */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
