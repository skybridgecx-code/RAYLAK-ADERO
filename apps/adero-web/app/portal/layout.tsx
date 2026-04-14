export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "#0f172a", color: "#f1f5f9" }}>
      <header
        className="border-b"
        style={{ background: "#0c1425", borderColor: "rgba(255,255,255,0.07)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center px-6 py-4">
          <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "#6366f1" }}>
            Adero
          </span>
          <span
            className="ml-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: "rgba(255,255,255,0.25)" }}
          >
            Member Portal
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>

      <footer className="border-t py-8 text-center" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <p className="text-xs" style={{ color: "#334155" }}>
          Questions about your status? Contact your Adero representative.
        </p>
      </footer>
    </div>
  );
}
