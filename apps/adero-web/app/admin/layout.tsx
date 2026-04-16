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
            <Link
              href="/admin/dispatch"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Dispatch
            </Link>
            <Link
              href="/admin/quality"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Quality
            </Link>
            <Link
              href="/admin/tracking"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Fleet Tracking
            </Link>
            <Link
              href="/admin/pricing"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Pricing Rules
            </Link>
            <Link
              href="/admin/pricing/quotes"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Quotes
            </Link>
            <Link
              href="/admin/pricing/invoices"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Invoices
            </Link>
            <Link
              href="/admin/pricing/payments"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Payments
            </Link>
            <Link
              href="/admin/pricing/stripe-accounts"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Stripe Accounts
            </Link>
            <Link
              href="/admin/dashboard"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/renewals"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Renewals
            </Link>
            <Link
              href="/admin/submissions"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Submissions
            </Link>
            <Link
              href="/admin/submissions/integrity"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              Chain Health
            </Link>
            <Link
              href="/admin/health"
              className="text-xs font-medium transition-colors"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              System Health
            </Link>
          </nav>

          <form method="GET" action="/admin/search" className="ml-auto flex items-center gap-2">
            <input
              name="q"
              type="text"
              placeholder="Search…"
              autoComplete="off"
              className="w-40 rounded-md border bg-transparent px-3 py-1.5 text-xs outline-none transition-all placeholder:text-slate-700 focus:w-56 focus:border-indigo-500/50"
              style={{ borderColor: "rgba(255,255,255,0.08)", color: "#94a3b8" }}
            />
          </form>

          <div className="flex items-center gap-4">
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
