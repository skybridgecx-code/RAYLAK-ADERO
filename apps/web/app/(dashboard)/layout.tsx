import type { Metadata } from "next";
import { requireRole } from "~/lib/auth";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export const metadata: Metadata = {
  title: {
    default: "Operator Dashboard",
    template: "%s | RAYLAK Dashboard",
  },
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["dispatcher", "admin", "owner"]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <DashboardSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
