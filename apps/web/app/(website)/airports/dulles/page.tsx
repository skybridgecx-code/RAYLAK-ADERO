import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dulles International Airport Transportation (IAD)",
  description:
    "Premium ground transportation to and from Washington Dulles International Airport (IAD). Professional chauffeurs, flight tracking, and meet & greet service.",
};

const FEATURES = [
  {
    label: "Flight Monitoring",
    detail: "Your driver tracks your flight in real time. Delays and early arrivals — we adjust.",
  },
  {
    label: "Meet & Greet",
    detail: "Your driver meets you in baggage claim with a name sign. No searching.",
  },
  {
    label: "Complimentary Wait Time",
    detail: "30-minute grace period from wheels-down for domestic flights. 45 minutes international.",
  },
  {
    label: "Dulles-Expert Drivers",
    detail: "Our drivers know IAD — terminal layout, peak hours, and optimal drop-off zones.",
  },
];

const VEHICLES = [
  { type: "Executive Sedan", capacity: "1–3 passengers + luggage" },
  { type: "Premium SUV", capacity: "1–6 passengers + luggage" },
  { type: "Mercedes Sprinter", capacity: "Up to 14 passengers" },
];

export default function DullesPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-4">
            IAD · Washington Dulles International Airport
          </p>
          <h1 className="text-white text-4xl sm:text-5xl font-light tracking-tight">
            Dulles Airport Transportation
          </h1>
          <p className="mt-5 text-white/60 text-base leading-relaxed max-w-xl mx-auto">
            Professional ground transportation to and from Washington Dulles (IAD). We track your
            flight so you never wait — and we&apos;re never late.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book?source=airport_dulles&service=airport_transfer"
              className="rounded bg-[#c9a96e] px-8 py-4 text-[#0c1830] font-semibold text-sm tracking-wide hover:bg-[#d4b87a] transition-colors"
            >
              Book Dulles Transfer
            </Link>
            <Link
              href="/contact"
              className="rounded border border-white/30 px-8 py-4 text-white text-sm tracking-wide hover:border-white/60 transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-24 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-3">
              The RAYLAK Difference
            </p>
            <h2 className="text-[#0c1830] text-3xl sm:text-4xl font-light tracking-tight">
              Why Dulles Travelers Choose RAYLAK
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div key={f.label} className="border border-gray-100 rounded-lg p-8">
                <div className="h-px w-8 bg-[#c9a96e] mb-5" />
                <h3 className="text-[#0c1830] font-semibold text-lg mb-3">{f.label}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Airport info */}
      <section className="py-20 px-4" style={{ background: "#f7f6f4" }}>
        <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          <div>
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
              About Dulles (IAD)
            </p>
            <h2 className="text-[#0c1830] text-2xl sm:text-3xl font-light tracking-tight mb-4">
              Washington&apos;s International Gateway
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Washington Dulles International Airport is located in Loudoun County, Virginia,
              approximately 26 miles west of downtown DC. Dulles is the primary international hub
              for the region, served by all major carriers.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              RAYLAK provides service to all terminals at IAD, including international arrivals.
              Our drivers stage in the designated pickup area and handle all luggage.
            </p>
          </div>
          <div>
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
              Available Vehicles
            </p>
            <div className="space-y-4">
              {VEHICLES.map((v) => (
                <div key={v.type} className="bg-white rounded-lg px-6 py-5 border border-gray-100">
                  <p className="text-[#0c1830] font-semibold text-sm">{v.type}</p>
                  <p className="text-gray-400 text-sm mt-1">{v.capacity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Other airports */}
      <section className="bg-white py-16 px-4">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-gray-400 text-sm mb-6">We also serve</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/airports/reagan"
              className="border border-gray-200 rounded-lg px-8 py-5 hover:border-[#c9a96e]/40 transition-colors"
            >
              <p className="text-[#0c1830] font-bold text-2xl tracking-widest">DCA</p>
              <p className="text-gray-400 text-xs mt-1">Reagan National</p>
            </Link>
            <Link
              href="/airports/bwi"
              className="border border-gray-200 rounded-lg px-8 py-5 hover:border-[#c9a96e]/40 transition-colors"
            >
              <p className="text-[#0c1830] font-bold text-2xl tracking-widest">BWI</p>
              <p className="text-gray-400 text-xs mt-1">BWI Marshall</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1830] py-16 px-4 text-center">
        <h2 className="text-white text-2xl font-light tracking-tight mb-6">
          Heading to or from Dulles?
        </h2>
        <Link
          href="/book?source=airport_dulles&service=airport_transfer"
          className="inline-block rounded bg-[#c9a96e] px-10 py-4 text-[#0c1830] font-semibold text-sm tracking-wide hover:bg-[#d4b87a] transition-colors"
        >
          Book Dulles Transfer
        </Link>
      </section>
    </>
  );
}
