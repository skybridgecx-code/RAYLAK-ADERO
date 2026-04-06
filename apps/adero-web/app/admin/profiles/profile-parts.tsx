import Link from "next/link";

export function fmt(date: Date | null) {
  if (!date) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const displayValue = value == null || value === "" ? "-" : value;

  return (
    <div className="flex gap-4 border-b py-3" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
      <dt className="w-40 shrink-0 text-xs font-medium" style={{ color: "#475569" }}>
        {label}
      </dt>
      <dd
        className="text-sm"
        style={{ color: value != null && value !== "" ? "#cbd5e1" : "#334155" }}
      >
        {displayValue}
      </dd>
    </div>
  );
}

export function ProfileShell({
  backHref,
  backLabel,
  children,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <Link href={backHref} className="text-xs transition-colors" style={{ color: "#475569" }}>
        {backLabel}
      </Link>
      {children}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div
      className="rounded-xl border py-16 text-center"
      style={{ borderColor: "rgba(255,255,255,0.07)", color: "#475569" }}
    >
      <p className="text-sm">{label}</p>
    </div>
  );
}
