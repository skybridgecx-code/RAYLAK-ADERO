"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ width: "100%", maxWidth: "640px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", borderRadius: "12px", padding: "24px" }}>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: 300 }}>Critical application error</h1>
            <p style={{ marginTop: "8px", color: "#94a3b8", fontSize: "14px" }}>
              Adero encountered an unrecoverable error in this route tree.
            </p>
            <p style={{ marginTop: "8px", color: "#64748b", fontSize: "12px" }}>
              {error.message || "Unexpected error"}
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: "16px", border: 0, borderRadius: "8px", padding: "8px 14px", background: "rgba(99,102,241,0.18)", color: "#c7d2fe", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              Reload Section
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
