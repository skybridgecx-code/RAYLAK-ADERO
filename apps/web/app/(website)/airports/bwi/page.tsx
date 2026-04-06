import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "BWI Marshall Airport Transportation (BWI)",
  description:
    "Premium ground transportation to and from Baltimore/Washington International Thurgood Marshall Airport (BWI). Professional chauffeurs with flight tracking.",
};

const FEATURES = [
  {
    label: "Flight Tracking",
    detail: "We monitor your flight from gate to landing. Your driver moves when you do.",
  },
  {
    label: "Luggage Assistance",
    detail: "Your driver assists with all luggage — no extra charge, no extra steps.",
  },
  {
    label: "BWI-to-DC Coverage",
    detail: "We serve all destinations from BWI to DC, Northern Virginia, and Maryland suburbs.",
  },
  {
    label: "All Terminals",
    detail: "Coverage across all BWI concourses including international arrivals.",
  },
];

const VEHICLES = [
  { type: "Executive Sedan", capacity: "1–3 passengers + luggage" },
  { type: "Premium SUV", capacity: "1–6 passengers + luggage" },
  { type: "Mercedes Sprinter", capacity: "Up to 14 passengers" },
];

export default function BWIPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-3xl">
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-4">
            BWI · Baltimore/Washington International Thurgood Marshall Airport
          </p>
          <h1 className="text-white text-4xl sm:text-5xl font-light tracking-tight">
            BWI Airport Transportation
          </h1>
          <p className="mt-5 text-white/60 text-base leading-relaxed max-w-xl mx-auto">
            Premium transfers to and from BWI Marshall Airport. Professional, punctual, and
            prepared for every flight.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book?source=airport_bwi&service=airport_transfer"
              className="rounded bg-[#c9a96e] px-8 py-4 text-[#0c1830] font-semibold text-sm tracking-wide hover:bg-[#d4b87a] transition-colors"
            >
              Book BWI Transfer
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
              Why BWI Travelers Choose RAYLAK
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
              About BWI Marshall
            </p>
            <h2 className="text-[#0c1830] text-2xl sm:text-3xl font-light tracking-tight mb-4">
              Maryland&apos;s Premier Airport
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              Baltimore/Washington International Thurgood Marshall Airport (BWI) is located
              approximately 10 miles south of Baltimore and 32 miles northeast of Washington DC,
              making it a popular choice for travelers throughout the region.
            </p>
            <p className="text-gray-500 text-sm leading-relaxed">
              RAYLAK serves all terminals at BWI, with particular expertise in the Concourse E
              international arrivals area. We handle the drive so you land stress-free.
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
              href="/airports/dulles"
              className="border border-gray-200 rounded-lg px-8 py-5 hover:border-[#c9a96e]/40 transition-colors"
            >
              <p className="text-[#0c1830] font-bold text-2xl tracking-widest">IAD</p>
              <p className="text-gray-400 text-xs mt-1">Dulles International</p>
            </Link>
            <Link
              href="/airports/reagan"
              className="border border-gray-200 rounded-lg px-8 py-5 hover:border-[#c9a96e]/40 transition-colors"
            >
              <p className="text-[#0c1830] font-bold text-2xl tracking-widest">DCA</p>
              <p className="text-gray-400 text-xs mt-1">Reagan National</p>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1830] py-16 px-4 text-center">
        <h2 className="text-white text-2xl font-light tracking-tight mb-6">
          Flying through BWI?
        </h2>
        <Link
          href="/book?source=airport_bwi&service=airport_transfer"
          className="inline-block rounded bg-[#c9a96e] px-10 py-4 text-[#0c1830] font-semibold text-sm tracking-wide hover:bg-[#d4b87a] transition-colors"
        >
          Book BWI Transfer
        </Link>
      </section>
    </>
  );
}
