import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "RAYLAK — Premium Transportation | DC Metro Area",
  description:
    "The standard for executive ground transportation in Washington DC. Airport transfers, corporate travel, and luxury charter services. Available 24/7.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "RAYLAK",
  description:
    "Premium executive ground transportation in Washington DC. Airport transfers, corporate travel, luxury charter.",
  url: "https://raylak.com",
  telephone: "+12025550100",
  areaServed: ["Washington DC", "Northern Virginia", "Maryland"],
  serviceType: [
    "Airport Transportation",
    "Executive Transportation",
    "Corporate Transportation",
    "Limousine Service",
  ],
  priceRange: "$$$$",
  openingHours: "Mo-Su 00:00-23:59",
};

const SERVICES = [
  {
    id: "airport",
    title: "Airport Transfers",
    description:
      "Seamless service to and from Dulles, Reagan National, and BWI. Flight monitoring included.",
  },
  {
    id: "corporate",
    title: "Corporate Travel",
    description:
      "Discreet, reliable transportation for executives, clients, and road warriors. Billed to account.",
  },
  {
    id: "charter",
    title: "Hourly Charter",
    description:
      "Reserve a vehicle and driver by the hour. Ideal for roadshows, meetings, or an open day.",
  },
  {
    id: "events",
    title: "Events",
    description:
      "Galas, state dinners, weddings, and private functions. Coordinated for large groups.",
  },
  {
    id: "point",
    title: "Point-to-Point",
    description: "Premium transfers between any two addresses in the DC Metro area and beyond.",
  },
  {
    id: "long",
    title: "Long Distance",
    description:
      "Comfortable rides to New York, Philadelphia, Richmond, and other regional destinations.",
  },
];

const FLEET = [
  { type: "Executive Sedan", capacity: "1–3", description: "Mercedes E-Class or equivalent" },
  { type: "Premium SUV", capacity: "1–6", description: "Cadillac Escalade or Suburban" },
  { type: "Luxury Van", capacity: "1–7", description: "Mercedes-Benz Metris or equivalent" },
  { type: "Mercedes Sprinter", capacity: "1–14", description: "First-class group travel" },
  { type: "Stretch Limousine", capacity: "1–10", description: "Special occasions & VIP arrivals" },
  { type: "Executive Bus", capacity: "15–30", description: "Corporate shuttles & large groups" },
];

const TESTIMONIALS = [
  {
    quote:
      "RAYLAK has been the only car service I trust for client pickups. The drivers are professional, the cars are immaculate, and they are never late.",
    author: "Michael T.",
    title: "Managing Director, Global Law Firm",
  },
  {
    quote:
      "I've used RAYLAK for every Dulles run for three years. They track my flight and are there even when I land early. Exceptional consistency.",
    author: "Sarah K.",
    title: "Senior Vice President, DC Consulting",
  },
  {
    quote:
      "For our firm's annual gala we needed 20 vehicles coordinated across two hotels. RAYLAK executed it flawlessly. Will not use anyone else.",
    author: "James R.",
    title: "Chief of Staff, Investment Group",
  },
];

const TRUST_SIGNALS = [
  { label: "Licensed & Insured", detail: "Commercial carrier authority, fully bonded" },
  { label: "Background-Checked", detail: "Every driver vetted to federal standards" },
  { label: "24/7 Availability", detail: "Reservations and support around the clock" },
  { label: "Flight Monitoring", detail: "We track your flight, you focus on your trip" },
];

const AIRPORTS = [
  { code: "IAD", name: "Dulles International", href: "/airports/dulles" },
  { code: "DCA", name: "Reagan National", href: "/airports/reagan" },
  { code: "BWI", name: "BWI Marshall", href: "/airports/bwi" },
];

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className="relative flex min-h-[92vh] flex-col items-center justify-center px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830 60%, #0e2040)" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle at 60% 40%, #c9a96e22 0%, transparent 65%)" }} />

        <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-6">
          Washington DC · Dulles · Reagan · BWI
        </p>
        <h1 className="text-white font-light text-4xl sm:text-5xl lg:text-7xl leading-tight tracking-tight max-w-4xl">
          The Standard for<br />
          <em className="not-italic font-semibold">Executive Transportation</em>
        </h1>
        <p className="mt-6 max-w-2xl text-white/60 text-base sm:text-lg leading-relaxed">
          Premium ground transportation for executives, travelers, and special occasions.
          Discreet, reliable, always on time.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link
            href="/book"
            className="rounded bg-[#c9a96e] px-8 py-4 text-[#0c1830] font-semibold tracking-wide text-sm hover:bg-[#d4b87a] transition-colors"
          >
            Request a Ride
          </Link>
          <Link
            href="/services"
            className="rounded border border-white/30 px-8 py-4 text-white text-sm tracking-wide hover:border-white/60 transition-colors"
          >
            View Services
          </Link>
        </div>

        {/* Stats bar */}
        <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 w-full max-w-3xl">
          {[
            ["10+", "Years of Service"],
            ["24/7", "Availability"],
            ["3", "Major Airports"],
            ["100%", "Professional"],
          ].map(([stat, label]) => (
            <div key={label} className="text-center">
              <p className="text-white font-semibold text-2xl">{stat}</p>
              <p className="text-white/50 text-xs uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <section id="services" className="bg-white py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              What We Offer
            </p>
            <h2 className="text-[#0c1830] text-3xl sm:text-4xl font-light tracking-tight">
              Premium Transportation Services
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((s) => (
              <div
                key={s.id}
                className="border border-gray-100 rounded-lg p-8 hover:border-[#c9a96e]/40 hover:shadow-md transition-all group"
              >
                <div className="h-px w-8 bg-[#c9a96e] mb-6 group-hover:w-12 transition-all" />
                <h3 className="text-[#0c1830] font-semibold text-lg mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/services"
              className="inline-block border border-[#0c1830] text-[#0c1830] px-8 py-3 rounded text-sm tracking-wide hover:bg-[#0c1830] hover:text-white transition-colors"
            >
              All Services
            </Link>
          </div>
        </div>
      </section>

      {/* ── Fleet Preview ─────────────────────────────────────────────────── */}
      <section
        id="fleet"
        className="py-24 px-4"
        style={{ background: "#f7f6f4" }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              The Fleet
            </p>
            <h2 className="text-[#0c1830] text-3xl sm:text-4xl font-light tracking-tight">
              Every Vehicle. Immaculate.
            </h2>
            <p className="mt-4 text-gray-500 max-w-xl mx-auto text-sm leading-relaxed">
              Our fleet is maintained to the highest standard. Each vehicle is inspected before
              every trip.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FLEET.map((v) => (
              <div key={v.type} className="bg-white rounded-lg p-8 border border-gray-100">
                <p className="text-[#c9a96e] text-xs font-semibold uppercase tracking-widest mb-3">
                  {v.capacity} passengers
                </p>
                <h3 className="text-[#0c1830] font-semibold text-lg mb-2">{v.type}</h3>
                <p className="text-gray-400 text-sm">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust Signals ────────────────────────────────────────────────── */}
      <section className="bg-[#0c1830] py-20 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              Why RAYLAK
            </p>
            <h2 className="text-white text-3xl sm:text-4xl font-light tracking-tight">
              Built on Trust. Defined by Precision.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {TRUST_SIGNALS.map((t) => (
              <div key={t.label} className="text-center">
                <div className="w-px h-8 bg-[#c9a96e] mx-auto mb-5" />
                <h3 className="text-white font-semibold text-base mb-2">{t.label}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{t.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="bg-white py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              Client Testimonials
            </p>
            <h2 className="text-[#0c1830] text-3xl sm:text-4xl font-light tracking-tight">
              The Standard They Expect
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.author} className="border border-gray-100 rounded-lg p-8">
                <p className="text-[#c9a96e] text-2xl mb-4 font-serif leading-none">&ldquo;</p>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">{t.quote}</p>
                <div className="h-px w-8 bg-[#c9a96e] mb-4" />
                <p className="text-[#0c1830] font-semibold text-sm">{t.author}</p>
                <p className="text-gray-400 text-xs mt-1">{t.title}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Airport Coverage ─────────────────────────────────────────────── */}
      <section className="py-20 px-4" style={{ background: "#f7f6f4" }}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              Airport Coverage
            </p>
            <h2 className="text-[#0c1830] text-3xl sm:text-4xl font-light tracking-tight">
              DC Metro Airports
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {AIRPORTS.map((a) => (
              <Link
                key={a.code}
                href={a.href}
                className="group bg-white rounded-lg p-10 border border-gray-100 hover:border-[#c9a96e]/40 hover:shadow-md transition-all text-center block"
              >
                <p className="text-[#0c1830] font-bold text-4xl tracking-widest mb-3 group-hover:text-[#c9a96e] transition-colors">
                  {a.code}
                </p>
                <p className="text-gray-500 text-sm">{a.name}</p>
                <p className="mt-4 text-[#c9a96e] text-xs tracking-widest uppercase font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More →
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
            Ready to Ride
          </p>
          <h2 className="text-white text-3xl sm:text-5xl font-light tracking-tight leading-tight mb-6">
            Reserve Your Vehicle Today
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-10 max-w-xl mx-auto">
            Advance reservations recommended. Same-day bookings accepted subject to availability.
          </p>
          <Link
            href="/book"
            className="inline-block rounded bg-[#c9a96e] px-10 py-4 text-[#0c1830] font-semibold tracking-wide text-sm hover:bg-[#d4b87a] transition-colors"
          >
            Request a Ride
          </Link>
          <p className="mt-6 text-white/40 text-sm">
            Or call us: <span className="text-white font-medium">(202) 555-0100</span>
          </p>
        </div>
      </section>
    </>
  );
}
