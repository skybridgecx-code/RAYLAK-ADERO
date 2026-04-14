import type { Metadata } from "next";
import Link from "next/link";
import { CompanyForm } from "./company-form";

export const metadata: Metadata = {
  title: "Company Application — Adero",
  description: "Apply to join the Adero network as a transportation company.",
};

export default function CompanyApplyPage() {
  return (
    <>
      {/* Header */}
      <section
        className="py-16 px-6"
        style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
      >
        <div className="mx-auto max-w-2xl">
          <Link
            href="/apply"
            className="text-xs transition-colors mb-6 inline-block"
            style={{ color: "#64748b" }}
          >
            ← All application types
          </Link>
          <p
            className="text-xs font-semibold uppercase tracking-[4px] mb-3"
            style={{ color: "#818cf8" }}
          >
            Company Application
          </p>
          <h1
            className="text-3xl sm:text-4xl font-light tracking-tight mb-3"
            style={{ color: "#f1f5f9" }}
          >
            Join Adero as a Company
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "#64748b" }}>
            Tell us about your company. We will reach out within 5 business days
            to discuss fit and next steps.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="py-16 px-6 bg-white">
        <div className="mx-auto max-w-2xl">
          <CompanyForm />
        </div>
      </section>
    </>
  );
}
