export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border p-6" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <div className="h-5 w-48 rounded" style={{ background: "rgba(255,255,255,0.08)" }} />
      <div className="mt-3 h-4 w-full rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="mt-2 h-4 w-2/3 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      <div className="mt-4 inline-flex items-center gap-2 text-xs" style={{ color: "#94a3b8" }}>
        <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ background: "#a78bfa" }} />
        Loading admin content...
      </div>
    </div>
  );
}
