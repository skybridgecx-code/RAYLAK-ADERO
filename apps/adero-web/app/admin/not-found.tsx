import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Not Found - Adero Admin",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default function AdminNotFound() {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border p-6" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
      <h1 className="text-xl font-light" style={{ color: "#f1f5f9" }}>
        Admin page not found
      </h1>
      <p className="mt-2 text-sm" style={{ color: "#94a3b8" }}>
        The admin page you requested could not be found.
      </p>
      <Link
        href="/admin"
        className="mt-4 inline-block rounded-md px-4 py-2 text-xs font-medium"
        style={{ background: "rgba(99,102,241,0.18)", color: "#c7d2fe" }}
      >
        Back to Admin Home
      </Link>
    </div>
  );
}
