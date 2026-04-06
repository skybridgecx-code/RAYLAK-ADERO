"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Overview", href: "/dashboard" },
  { label: "Bookings", href: "/dashboard/bookings" },
  { label: "Vehicles", href: "/dashboard/vehicles" },
  { label: "Drivers", href: "/dashboard/drivers" },
  { label: "Customers", href: "/dashboard/customers" },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-52 min-h-screen bg-[#0c1830] flex-shrink-0">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/" className="text-[#c9a96e] text-xs tracking-[4px] uppercase font-semibold">
          RAYLAK
        </Link>
        <p className="text-white/30 text-[10px] tracking-widest mt-1 uppercase">Operator</p>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 px-3 py-4 flex-1">
        {NAV.map((item) => {
          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-white font-medium"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-white/10">
        <Link
          href="/"
          className="text-white/30 hover:text-white/60 text-xs transition-colors"
        >
          ← Public site
        </Link>
      </div>
    </aside>
  );
}
