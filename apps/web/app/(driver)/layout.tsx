import type { Metadata, Viewport } from "next";
import { requireRole } from "~/lib/auth";

export const metadata: Metadata = {
  title: {
    default: "RAYLAK Driver",
    template: "%s | RAYLAK Driver",
  },
  manifest: "/driver-manifest.json", // PWA manifest — added in Phase X
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // PWA full-screen feel
};

export const dynamic = "force-dynamic";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  // Gate: driver role only
  await requireRole(["driver"]);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Driver PWA nav bar added in Phase X */}
      <main className="pb-safe flex-1">{children}</main>
      {/* Driver bottom tab bar added in Phase X */}
    </div>
  );
}
