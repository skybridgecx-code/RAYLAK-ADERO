import Link from "next/link";

// Shared shell for all /apply/* pages — lightweight nav, no auth required.
export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="border-b"
        style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.08)" }}
      >
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span
              className="text-base font-bold tracking-widest uppercase"
              style={{ color: "#6366f1" }}
            >
              Adero
            </span>
            <span
              className="hidden sm:inline-block text-xs tracking-wider uppercase font-medium"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Network
            </span>
          </Link>
          <Link
            href="/apply"
            className="text-xs transition-colors"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Application Portal
          </Link>
        </div>
      </header>
      {children}
    </>
  );
}
