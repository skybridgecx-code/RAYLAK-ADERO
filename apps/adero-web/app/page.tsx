import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Adero — The Dispatch Network for Premium Transportation",
};

function Nav() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="text-base font-bold tracking-widest uppercase"
            style={{ color: "#6366f1" }}
          >
            Adero
          </span>
          <span
            className="hidden sm:inline-block text-xs tracking-wider uppercase font-medium"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            Network
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: "For Companies", href: "#companies" },
            { label: "For Operators", href: "#operators" },
            { label: "How It Works", href: "#how" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/auth/sign-in"
            className="rounded px-4 py-2 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: "rgba(255,255,255,0.6)" }}
          >
            Sign In
          </Link>
          <a
            href="/apply"
            className="rounded px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-80"
            style={{ background: "#6366f1" }}
          >
            Apply to Join
          </a>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      className="py-28 px-6 text-center"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
    >
      <div className="mx-auto max-w-4xl">
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-8"
          style={{
            borderColor: "rgba(99,102,241,0.4)",
            color: "#818cf8",
            background: "rgba(99,102,241,0.08)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#6366f1" }}
          />
          B2B Network · By Invitation Only
        </div>

        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1] mb-6"
          style={{ color: "#f1f5f9" }}
        >
          The dispatch network
          <br />
          <span style={{ color: "#818cf8" }}>behind premium transportation.</span>
        </h1>

        <p
          className="text-lg sm:text-xl leading-relaxed max-w-2xl mx-auto mb-10"
          style={{ color: "#94a3b8" }}
        >
          Adero connects luxury transportation companies with verified overflow capacity,
          trusted affiliate partners, and backup driver networks — so you can accept
          every booking, every time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/apply/company"
            className="rounded-lg px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "#6366f1" }}
          >
            Apply for Company Access
          </a>
          <a
            href="/apply/operator"
            className="rounded-lg border px-8 py-3.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            I&apos;m an Operator →
          </a>
        </div>
      </div>
    </section>
  );
}

function StatsBar() {
  const stats = [
    { value: "Premium Only", label: "Vetted network members" },
    { value: "B2B", label: "No consumer marketplace" },
    { value: "Real-time", label: "Live overflow dispatch" },
    { value: "Recurring", label: "Relationship-based assignments" },
  ];

  return (
    <section style={{ background: "#1e293b" }}>
      <div className="mx-auto max-w-6xl px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.value} className="text-center">
            <p
              className="text-xl font-bold tracking-tight"
              style={{ color: "#818cf8" }}
            >
              {s.value}
            </p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ForCompanies() {
  const features = [
    {
      icon: "→",
      title: "Overflow Dispatch",
      body: "When your fleet is at capacity, route excess bookings to pre-vetted Adero partners instantly. Never turn a client away again.",
    },
    {
      icon: "◈",
      title: "Backup Capacity",
      body: "Last-minute driver cancellations happen. Adero gives you a trusted bench of qualified operators ready to step in on demand.",
    },
    {
      icon: "⟳",
      title: "Recurring Relationships",
      body: "Build long-term affiliate relationships with companies whose standards match yours. Consistent partners, consistent quality.",
    },
    {
      icon: "✦",
      title: "Quality-Controlled Network",
      body: "Every company and operator on Adero is vetted. No ride-share drivers. No mass marketplaces. Premium only.",
    },
  ];

  return (
    <section id="companies" className="py-24 px-6 bg-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14">
          <p
            className="text-xs font-semibold uppercase tracking-[4px] mb-3"
            style={{ color: "#6366f1" }}
          >
            For Transportation Companies
          </p>
          <h2
            className="text-3xl sm:text-4xl font-light tracking-tight"
            style={{ color: "#0f172a" }}
          >
            Accept more bookings.
            <br />
            Deliver every time.
          </h2>
          <p className="mt-4 text-base leading-relaxed max-w-xl" style={{ color: "#64748b" }}>
            Your clients expect perfection. Adero gives you the infrastructure to
            guarantee it — even when your own fleet is stretched thin.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border p-8"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold mb-5"
                style={{ background: "rgba(99,102,241,0.08)", color: "#6366f1" }}
              >
                {f.icon}
              </div>
              <h3
                className="text-base font-semibold mb-2"
                style={{ color: "#0f172a" }}
              >
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForOperators() {
  const benefits = [
    {
      title: "More Ride Opportunities",
      body: "Access overflow bookings from premium transportation companies in your market. Fill your schedule with quality rides.",
    },
    {
      title: "Vetted Partner Companies",
      body: "Every company on Adero is verified and premium-focused. You&apos;re not working with just anyone — these are brands that share your standards.",
    },
    {
      title: "Affiliate Income Stream",
      body: "Build consistent, recurring relationships with companies that need your capacity. Predictable work from trusted partners.",
    },
    {
      title: "Your Independence, Amplified",
      body: "Adero does not employ you. You choose which companies to partner with and which bookings to accept. Stay independent, get more work.",
    },
  ];

  return (
    <section
      id="operators"
      className="py-24 px-6"
      style={{ background: "#f8fafc" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14">
          <p
            className="text-xs font-semibold uppercase tracking-[4px] mb-3"
            style={{ color: "#6366f1" }}
          >
            For Independent Operators &amp; Chauffeurs
          </p>
          <h2
            className="text-3xl sm:text-4xl font-light tracking-tight"
            style={{ color: "#0f172a" }}
          >
            Your expertise.
            <br />
            Better-matched clients.
          </h2>
          <p className="mt-4 text-base leading-relaxed max-w-xl" style={{ color: "#64748b" }}>
            If you run a professional luxury transportation operation, Adero connects
            you with companies that need exactly what you offer.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4">
              <div
                className="w-1 rounded-full flex-shrink-0 mt-1"
                style={{ background: "rgba(99,102,241,0.3)" }}
              />
              <div>
                <h3
                  className="text-sm font-semibold mb-1.5"
                  style={{ color: "#0f172a" }}
                >
                  {b.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                  {b.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Apply",
      body: "Submit your company or operator profile. We review your fleet, standards, and service area.",
    },
    {
      n: "02",
      title: "Get Vetted",
      body: "Our team verifies credentials, insurance, and service quality. Adero is invite and approval only.",
    },
    {
      n: "03",
      title: "Connect & Dispatch",
      body: "Accept overflow bookings from partner companies or route your excess to the network — in real time.",
    },
    {
      n: "04",
      title: "Build Relationships",
      body: "Recurring partners build trust over time. Adero surfaces your track record so companies choose you first.",
    },
  ];

  return (
    <section
      id="how"
      className="py-24 px-6"
      style={{ background: "#0f172a" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <p
            className="text-xs font-semibold uppercase tracking-[4px] mb-3"
            style={{ color: "#6366f1" }}
          >
            How It Works
          </p>
          <h2
            className="text-3xl sm:text-4xl font-light tracking-tight"
            style={{ color: "#f1f5f9" }}
          >
            Simple by design.
            <br />
            Serious by nature.
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="rounded-xl border p-8"
              style={{
                borderColor: "rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <p
                className="text-4xl font-bold tracking-tight mb-4"
                style={{ color: "rgba(99,102,241,0.4)" }}
              >
                {s.n}
              </p>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "#f1f5f9" }}
              >
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PositioningCallout() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-3xl text-center">
        <div
          className="inline-block rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest mb-6"
          style={{ borderColor: "#e2e8f0", color: "#64748b" }}
        >
          Not a Gig Platform
        </div>
        <h2
          className="text-2xl sm:text-3xl font-light tracking-tight mb-5"
          style={{ color: "#0f172a" }}
        >
          Adero is infrastructure — not a marketplace.
        </h2>
        <p className="text-base leading-relaxed" style={{ color: "#64748b" }}>
          Unlike consumer ride-share platforms, Adero operates entirely B2B. There
          are no star ratings from passengers, no surge pricing games, and no
          race to the bottom on rates. Adero is where premium transportation
          businesses build the relationships that keep operations running at the
          highest level.
        </p>

        <div className="mt-10 grid sm:grid-cols-3 gap-6">
          {[
            { label: "Adero", desc: "B2B dispatch network. Companies and vetted operators only.", positive: true },
            { label: "Consumer apps", desc: "Direct-to-passenger. Mass market. Driver pool with no vetting.", positive: false },
            { label: "Staff agencies", desc: "Employment-based. Adero is partnership-based — you stay independent.", positive: false },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border p-5 text-left"
              style={{
                borderColor: item.positive ? "#6366f1" : "#e2e8f0",
                background: item.positive ? "rgba(99,102,241,0.04)" : "transparent",
              }}
            >
              <p
                className="text-sm font-semibold mb-1.5"
                style={{ color: item.positive ? "#6366f1" : "#94a3b8" }}
              >
                {item.label}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ApplyCTA() {
  return (
    <section
      id="apply"
      className="py-24 px-6"
      style={{ background: "linear-gradient(160deg, #1e293b 0%, #0f172a 100%)" }}
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2
          className="text-3xl sm:text-4xl font-light tracking-tight mb-4"
          style={{ color: "#f1f5f9" }}
        >
          Ready to strengthen your network?
        </h2>
        <p className="text-base leading-relaxed mb-10" style={{ color: "#64748b" }}>
          Applications are reviewed individually. We are selective by design — every
          member of the Adero network reflects on every other.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/apply/company"
            className="rounded-lg px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "#6366f1" }}
          >
            Apply as a Company
          </a>
          <a
            href="/apply/operator"
            className="rounded-lg border px-8 py-3.5 text-sm font-medium transition-colors hover:bg-white/5"
            style={{
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.6)",
            }}
          >
            Apply as an Operator
          </a>
        </div>

        <p className="mt-8 text-xs" style={{ color: "#475569" }}>
          Adero is currently accepting applications from select markets.
          All applicants are reviewed within 5 business days.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="border-t px-6 py-8"
      style={{ background: "#0f172a", borderColor: "rgba(255,255,255,0.06)" }}
    >
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="text-sm font-bold tracking-widest uppercase"
            style={{ color: "#6366f1" }}
          >
            Adero
          </span>
          <span
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.2)" }}
          >
            B2B Dispatch Network
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a
            href="mailto:network@adero.io"
            className="text-xs transition-colors hover:text-white/60"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            network@adero.io
          </a>
          <span
            className="text-xs"
            style={{ color: "rgba(255,255,255,0.15)" }}
          >
            © {new Date().getFullYear()} Adero. All rights reserved.
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <StatsBar />
        <ForCompanies />
        <ForOperators />
        <HowItWorks />
        <PositioningCallout />
        <ApplyCTA />
      </main>
      <Footer />
    </>
  );
}
