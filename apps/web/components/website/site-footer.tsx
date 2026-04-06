import Link from "next/link";

const AIRPORT_LINKS = [
  { label: "Dulles International (IAD)", href: "/airports/dulles" },
  { label: "Reagan National (DCA)", href: "/airports/reagan" },
  { label: "BWI Marshall (BWI)", href: "/airports/bwi" },
];

const SERVICE_LINKS = [
  { label: "Airport Transfers", href: "/services#airport" },
  { label: "Corporate Travel", href: "/services#corporate" },
  { label: "Hourly Charter", href: "/services#charter" },
  { label: "Event Transportation", href: "/services#events" },
  { label: "Long Distance", href: "/services#long-distance" },
];

export function SiteFooter() {
  return (
    <footer className="bg-[#060e1d] text-white/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <p className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold mb-4">
              RAYLAK
            </p>
            <p className="text-sm leading-relaxed max-w-xs">
              Premium executive transportation serving the DC Metro area. Available 24/7 for airport
              transfers, corporate travel, and special events.
            </p>
            <p className="mt-6 text-sm">
              <span className="text-white font-medium">(202) 555-0100</span>
            </p>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
              Services
            </h3>
            <ul className="space-y-2">
              {SERVICE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Airports */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
              Airports
            </h3>
            <ul className="space-y-2">
              {AIRPORT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
              Company
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact" className="text-sm hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/book" className="text-sm hover:text-white transition-colors">
                  Book a Ride
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between gap-4 text-xs text-white/40">
          <p>© {new Date().getFullYear()} RAYLAK. All rights reserved.</p>
          <p>Licensed & Insured · DC Metro Area · 24/7 Service</p>
        </div>
      </div>
    </footer>
  );
}
