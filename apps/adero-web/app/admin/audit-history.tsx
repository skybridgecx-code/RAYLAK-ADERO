import type { AderoAuditLog } from "@raylak/db";

function fmt(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditHistory({ entries }: { entries: AderoAuditLog[] }) {
  return (
    <section>
      <h2
        className="mb-4 text-xs font-semibold uppercase tracking-[3px]"
        style={{ color: "#475569" }}
      >
        Audit History
      </h2>

      {entries.length === 0 ? (
        <p className="text-sm" style={{ color: "#334155" }}>
          No audit entries yet.
        </p>
      ) : (
        <div
          className="overflow-hidden rounded-xl border"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        >
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="border-b px-4 py-3 last:border-b-0"
              style={{
                borderColor: "rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.01)",
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium" style={{ color: "#cbd5e1" }}>
                  {entry.summary}
                </span>
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}
                >
                  {entry.action.replaceAll("_", " ")}
                </span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "#64748b" }}>
                {fmt(entry.createdAt)}
                {entry.actorName ? ` by ${entry.actorName}` : ""}
              </p>
              {entry.details && (
                <p className="mt-2 whitespace-pre-wrap text-xs" style={{ color: "#64748b" }}>
                  {entry.details}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
