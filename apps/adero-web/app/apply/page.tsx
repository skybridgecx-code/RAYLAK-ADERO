import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Apply to Join the Adero Network",
  description:
    "Apply to join Adero as a transportation company or an independent operator.",
};

export default function ApplyChooserPage() {
  return (
    <>
      {/* Header */}
      <section
        className="py-20 px-6 text-center"
        style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
      >
        <div className="mx-auto max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-[5px] mb-4"
            style={{ color: "#818cf8" }}
          >
            Join the Network
          </p>
          <h1
            className="text-3xl sm:text-4xl font-light tracking-tight mb-4"
            style={{ color: "#f1f5f9" }}
          >
            How would you like to join Adero?
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#64748b" }}>
            Adero serves two distinct audiences. Choose the path that fits your situation.
          </p>
        </div>
      </section>

      {/* Chooser */}
      <section className="py-20 px-6 bg-white">
        <div className="mx-auto max-w-3xl grid sm:grid-cols-2 gap-6">
          {/* Company */}
          <Link
            href="/apply/company"
            className="group rounded-2xl border p-8 transition-shadow hover:shadow-md block"
            style={{ borderColor: "#e2e8f0" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5"
              style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}
            >
              ◈
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "#0f172a" }}
            >
              Transportation Company
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#64748b" }}>
              You operate a fleet and want to access overflow capacity, route
              excess bookings to trusted partners, or find reliable affiliate operators.
            </p>
            <span
              className="text-sm font-semibold transition-colors group-hover:underline"
              style={{ color: "#6366f1" }}
            >
              Apply as a company →
            </span>
          </Link>

          {/* Operator */}
          <Link
            href="/apply/operator"
            className="group rounded-2xl border p-8 transition-shadow hover:shadow-md block"
            style={{ borderColor: "#e2e8f0" }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-5"
              style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}
            >
              ⟳
            </div>
            <h2
              className="text-lg font-semibold mb-2"
              style={{ color: "#0f172a" }}
            >
              Independent Operator
            </h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#64748b" }}>
              You are a professional chauffeur or small operator who wants access
              to overflow bookings from premium transportation companies.
            </p>
            <span
              className="text-sm font-semibold transition-colors group-hover:underline"
              style={{ color: "#6366f1" }}
            >
              Apply as an operator →
            </span>
          </Link>
        </div>

        <p className="text-center text-xs mt-10" style={{ color: "#94a3b8" }}>
          Not sure which applies to you?{" "}
          <a href="mailto:network@adero.io" style={{ color: "#6366f1" }}>
            Email us
          </a>{" "}
          and we will help.
        </p>
      </section>
    </>
  );
}
