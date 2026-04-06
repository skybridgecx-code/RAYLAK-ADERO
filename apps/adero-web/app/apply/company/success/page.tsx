import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Application Received — Adero",
  robots: { index: false },
};

export default function CompanySuccessPage() {
  return (
    <section
      className="min-h-screen flex items-center justify-center px-6 py-24"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
    >
      <div className="mx-auto max-w-lg text-center">
        <div
          className="mx-auto mb-8 w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
          style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}
        >
          ✓
        </div>
        <p
          className="text-xs font-semibold uppercase tracking-[5px] mb-4"
          style={{ color: "#818cf8" }}
        >
          Application Received
        </p>
        <h1
          className="text-3xl font-light tracking-tight mb-4"
          style={{ color: "#f1f5f9" }}
        >
          Thank you for applying.
        </h1>
        <p className="text-base leading-relaxed mb-10" style={{ color: "#64748b" }}>
          We have received your company application and will review it personally.
          Expect to hear from us within 5 business days at the email address you
          provided.
        </p>

        <div
          className="rounded-xl border p-6 text-left mb-10"
          style={{
            borderColor: "rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-[3px] mb-3"
            style={{ color: "#64748b" }}
          >
            What happens next
          </p>
          <ol className="space-y-2">
            {[
              "Our team reviews your application and verifies your company.",
              "We reach out to schedule a brief call to discuss fit.",
              "Approved companies gain access to the Adero dispatch network.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm" style={{ color: "#94a3b8" }}>
                <span style={{ color: "#6366f1" }} className="flex-shrink-0 font-semibold">
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="rounded-lg px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: "#6366f1", color: "#fff" }}
          >
            Back to Adero
          </Link>
          <a
            href="mailto:network@adero.io"
            className="rounded-lg border px-6 py-2.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}
          >
            Contact us
          </a>
        </div>
      </div>
    </section>
  );
}
