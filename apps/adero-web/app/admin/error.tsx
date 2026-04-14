"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border p-6" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <h2 className="text-xl font-light" style={{ color: "#f1f5f9" }}>
        Admin section error
      </h2>
      <p className="mt-2 text-sm" style={{ color: "#94a3b8" }}>
        The admin panel encountered an unexpected error.
      </p>
      <p className="mt-2 text-xs" style={{ color: "#64748b" }}>
        {error.message || "Unexpected error"}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md px-4 py-2 text-xs font-medium"
        style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
      >
        Retry
      </button>
    </div>
  );
}
