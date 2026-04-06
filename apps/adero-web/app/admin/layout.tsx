import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#0f172a", color: "#f1f5f9" }}>
      <header
        className="border-b sticky top-0 z-10"
        style={{ background: "#0c1425", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
            <span
              className="text-sm font-bold tracking-widest uppercase"
              style={{ color: "#6366f1" }}
            >
              Adero
            </span>
            <span
              className="text-xs tracking-wider uppercase font-medium"
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
