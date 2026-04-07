import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#0f172a", color: "#f1f5f9" }}>
      <header
        className="sticky top-0 z-10 border-b"
        style={{ background: "#0c1425", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          <Link href="/admin" className="flex shrink-0 items-center gap-2">
            <span
              className="text-sm font-bold uppercase tracking-widest"
              style={{ color: "#6366f1" }}
            >
              Adero
            </span>
            <span
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              Admin
            </span>
          </Link>

          <nav className="flex items-center gap-5">
            <Link
              href="/admin"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Applications
            </Link>
            <Link
              href="/admin/profiles"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Members
            </Link>
            <Link
              href="/admin/compliance"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Compliance
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-4">
            <Link
              href="/"
              className="text-xs transition-colors"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              ← Site
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
