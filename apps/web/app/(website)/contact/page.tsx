import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Reach RAYLAK for reservations, corporate accounts, and general inquiries. Available 24/7.",
};

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: "linear-gradient(165deg, #0c1830, #0e2040)" }}
      >
        <div className="mx-auto max-w-2xl">
          <p className="text-[#c9a96e] text-xs tracking-[5px] uppercase font-semibold mb-4">
            Contact
          </p>
          <h1 className="text-white text-4xl sm:text-5xl font-light tracking-tight">
            We&apos;re Here Around the Clock
          </h1>
          <p className="mt-5 text-white/60 text-base leading-relaxed">
            For reservations, account inquiries, or to discuss your transportation needs.
          </p>
        </div>
      </section>

      {/* Contact blocks */}
      <section className="bg-white py-24 px-4">
        <div className="mx-auto max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              label: "Reservations",
              value: "(202) 555-0100",
              detail: "Available 24 hours, 7 days a week",
              action: "tel:+12025550100",
              actionLabel: "Call Now",
            },
            {
              label: "Email",
              value: "reservations@raylak.com",
              detail: "Responses within 2 business hours",
              action: "mailto:reservations@raylak.com",
              actionLabel: "Send Email",
            },
            {
              label: "Online Booking",
              value: "Book instantly",
              detail: "Confirmation within minutes",
              action: "/book",
              actionLabel: "Request a Ride",
            },
          ].map((c) => (
            <div key={c.label} className="border border-gray-100 rounded-lg p-8">
              <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
                {c.label}
              </p>
              <p className="text-[#0c1830] font-semibold text-lg mb-2">{c.value}</p>
              <p className="text-gray-400 text-sm mb-6">{c.detail}</p>
              <Link
                href={c.action}
                className="text-sm text-[#0c1830] font-medium border-b border-[#c9a96e] pb-0.5 hover:text-[#c9a96e] transition-colors"
              >
                {c.actionLabel} →
              </Link>
            </div>
          ))}
        </div>

        {/* Service area */}
        <div className="mx-auto max-w-5xl mt-16">
          <div className="bg-[#f7f6f4] rounded-lg p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
                  Service Area
                </p>
                <h2 className="text-[#0c1830] text-2xl font-light tracking-tight mb-4">
                  DC Metro & Beyond
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  We serve Washington DC, Northern Virginia, Maryland, and the surrounding region.
                  Long-distance service available to New York, Philadelphia, Richmond, and beyond.
                </p>
              </div>
              <div>
                <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
                  Corporate Accounts
                </p>
                <h2 className="text-[#0c1830] text-2xl font-light tracking-tight mb-4">
                  Volume & Account Pricing
                </h2>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Firms with recurring transportation needs qualify for corporate account pricing,
                  monthly invoicing, and a dedicated account manager. Contact us to discuss.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0c1830] py-16 px-4 text-center">
        <h2 className="text-white text-2xl font-light tracking-tight mb-6">
          Ready to Book Your Next Ride?
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
