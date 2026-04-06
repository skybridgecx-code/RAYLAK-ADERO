import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Executive ground transportation services in DC Metro: airport transfers, corporate travel, hourly charter, events, point-to-point, and long distance.",
};

const SERVICES = [
  {
    id: "airport",
    label: "Airport Transfer",
    headline: "Your Flight Lands. We're Already There.",
    description:
      "We monitor your flight in real time. Whether you land early, on time, or delayed — your driver adjusts. Service covers all three DC Metro airports: Dulles (IAD), Reagan National (DCA), and BWI Marshall.",
    details: [
      "Flight tracking included at no extra charge",
      "Meet & greet inside the terminal on request",
      "30-minute grace period for checked baggage",
      "Available for departures, arrivals, and connecting layovers",
    ],
    airports: [
      { code: "IAD", href: "/airports/dulles", name: "Dulles" },
      { code: "DCA", href: "/airports/reagan", name: "Reagan" },
      { code: "BWI", href: "/airports/bwi", name: "BWI" },
    ],
  },
  {
    id: "corporate",
    label: "Corporate Travel",
    headline: "The Transfer Your Clients Deserve.",
    description:
      "Corporate accounts available for firms with recurring transportation needs. Dedicated account management, monthly invoicing, and a consistent experience your team can rely on.",
    details: [
      "Account billing with monthly invoicing",
      "Dedicated account manager",
      "Confidentiality policy for all passengers",
      "Suitable for roadshows, board meetings, and client hospitality",
    ],
  },
  {
    id: "charter",
    label: "Hourly Charter",
    headline: "Your Driver. Your Schedule. Your Terms.",
    description:
      "Reserve a vehicle and chauffeur by the hour. Ideal for full-day meetings, investor roadshows, diplomatic rounds, or any engagement where flexibility matters.",
    details: [
      "Minimum 2-hour booking",
      "Driver stays with you throughout",
      "Ideal for multi-stop days and spontaneous schedule changes",
      "All vehicle classes available",
    ],
  },
  {
    id: "events",
    label: "Event Transportation",
    headline: "Flawless Arrivals for Every Occasion.",
    description:
      "From state dinners and gala fundraisers to weddings and private celebrations — we coordinate ground logistics so your event runs without friction.",
    details: [
      "Multi-vehicle coordination for large groups",
      "Timing synchronized with event schedules",
      "Staging and holding area management",
      "Ideal for 10 to 100+ guests",
    ],
  },
  {
    id: "point",
    label: "Point-to-Point",
    headline: "Premium Transfers. Any Two Points.",
    description:
      "Direct, no-stops luxury transfers between any two addresses in the DC Metro area. Clean vehicles, professional drivers, on-time every time.",
    details: [
      "Anywhere in the DC Metro area",
      "Available around the clock",
      "Sedan, SUV, van, or sprinter",
      "Book with as little as 2 hours notice (subject to availability)",
    ],
  },
  {
    id: "long-distance",
    label: "Long Distance",
    headline: "Comfort Across State Lines.",
    description:
      "When flying doesn't make sense — or isn't an option — RAYLAK provides comfortable, private ground transportation to New York, Philadelphia, Richmond, Pittsburgh, and beyond.",
    details: [
      "New York, Philadelphia, Richmond, and more",
      "Wi-Fi equipped vehicles available",
      "Refreshments on request",
      "No airline lines, no security, no delays",
    ],
  },
];

const FLEET = [
  { type: "Executive Sedan", capacity: "1–3", description: "Mercedes E-Class or equivalent. Ideal for individual executives." },
  { type: "Premium SUV", capacity: "1–6", description: "Cadillac Escalade or Chevrolet Suburban. Maximum comfort for small groups." },
  { type: "Luxury Van", capacity: "1–7", description: "Mercedes-Benz Metris. Perfect for families and small groups with luggage." },
  { type: "Mercedes Sprinter", capacity: "1–14", description: "The executive group solution. Cabin-style seating, ample luggage space." },
  { type: "Stretch Limousine", capacity: "1–10", description: "For weddings, galas, and VIP arrivals that demand a statement." },
  { type: "Executive Bus", capacity: "15–30", description: "Corporate shuttles, conference transfers, and large event groups." },
];

export default function ServicesPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830 60%, #0e2040)" }}
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-4">
            Our Services
          </p>
          <h1 className="text-white text-4xl sm:text-5xl font-light tracking-tight">
            Transportation Built Around You
          </h1>
          <p className="mt-5 text-white/60 text-base leading-relaxed max-w-xl mx-auto">
            Every service is designed for the demands of executives, frequent travelers, and private
            clients who will not accept a compromise.
          </p>
        </div>
      </section>

      {/* Services detail */}
      <section className="bg-white py-24 px-4">
        <div className="mx-auto max-w-7xl space-y-20">
          {SERVICES.map((s, i) => (
            <div
              key={s.id}
              id={s.id}
              className={`flex flex-col lg:flex-row gap-12 items-start ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}
            >
              <div className="lg:w-1/2">
                <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
                  {s.label}
                </p>
                <h2 className="text-[#0c1830] text-2xl sm:text-3xl font-light tracking-tight mb-4">
                  {s.headline}
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{s.description}</p>
                <ul className="space-y-2">
                  {s.details.map((d) => (
                    <li key={d} className="flex gap-3 text-sm text-gray-600">
                      <span className="text-[#c9a96e] mt-0.5 flex-shrink-0">—</span>
                      {d}
                    </li>
                  ))}
                </ul>
                {"airports" in s && s.airports && (
                  <div className="mt-6 flex gap-3">
                    {s.airports.map((a) => (
                      <Link
                        key={a.code}
                        href={a.href}
                        className="border border-[#c9a96e]/40 text-[#0c1830] text-xs px-4 py-2 rounded hover:bg-[#c9a96e]/10 transition-colors font-medium tracking-wide"
                      >
                        {a.code} · {a.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <div className="lg:w-1/2 bg-[#f7f6f4] rounded-lg p-10 flex items-center justify-center min-h-[200px]">
                <Link
                  href={`/book?service=${s.id}`}
                  className="rounded bg-[#0c1830] px-8 py-4 text-white text-sm font-semibold tracking-wide hover:bg-[#0e2040] transition-colors"
                >
                  Book This Service
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fleet */}
      <section id="fleet" className="py-24 px-4" style={{ background: "#f7f6f4" }}>
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              The Fleet
            </p>
            <h2 className="text-[#0c1830] text-3xl sm:text-4xl font-light tracking-tight">
              Every Vehicle. Immaculate.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FLEET.map((v) => (
              <div key={v.type} className="bg-white rounded-lg p-8 border border-gray-100">
                <p className="text-[#c9a96e] text-xs font-semibold uppercase tracking-widest mb-3">
                  Up to {v.capacity} passengers
                </p>
                <h3 className="text-[#0c1830] font-semibold text-lg mb-2">{v.type}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 px-4 text-center"
        style={{ background: "#0c1830" }}
      >
        <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
          Ready to Book
        </p>
        <h2 className="text-white text-3xl sm:text-4xl font-light tracking-tight mb-8">
          Reserve Your Vehicle
        </h2>
        <Link
          href="/book"
          className="inline-block rounded bg-[#c9a96e] px-10 py-4 text-[#0c1830] font-semibold text-sm tracking-wide hover:bg-[#d4b87a] transition-colors"
        >
          Request a Ride
        </Link>
      </section>
    </>
  );
}
