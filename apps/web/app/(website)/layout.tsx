import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "RAYLAK — Premium Transportation",
    template: "%s | RAYLAK",
  },
};

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Site header and nav added in Phase 2 */}
      <main className="flex-1">{children}</main>
      {/* Site footer added in Phase 2 */}
    </div>
  );
}
