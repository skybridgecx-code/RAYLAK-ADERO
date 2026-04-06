import type { Metadata, Viewport } from "next";
import { requireRole } from "~/lib/auth";
import { DriverBottomTabs } from "@/components/driver/driver-bottom-tabs";
import { DriverRealtime } from "@/components/driver/driver-realtime";

export const metadata: Metadata = {
  title: {
    default: "RAYLAK Driver",
    template: "%s | RAYLAK Driver",
  },
  manifest: "/driver-manifest.json",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["driver"]);

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-gray-100 bg-white px-4">
        <span className="text-sm font-bold tracking-widest text-[#0c1830]">RAYLAK</span>
        <span className="rounded-full bg-[#0c1830] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#c9a96e]">
          Driver
        </span>
      </header>

      {/* Invisible client shell: location tracking + realtime event subscription */}
      <DriverRealtime />

      {/* Page content — leave room for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      <DriverBottomTabs />
    </div>
  );
}
