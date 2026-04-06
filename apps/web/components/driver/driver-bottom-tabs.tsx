"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/driver",
    label: "Queue",
    icon: (active: boolean) => (
      <svg className={`h-5 w-5 ${active ? "text-[#c9a96e]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    href: "/driver/history",
    label: "History",
    icon: (active: boolean) => (
      <svg className={`h-5 w-5 ${active ? "text-[#c9a96e]" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export function DriverBottomTabs() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 flex h-16 border-t border-gray-100 bg-white">
      {TABS.map((tab) => {
        const active = tab.href === "/driver"
          ? pathname === "/driver"
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
          >
            {tab.icon(active)}
            <span className={`text-[10px] font-medium ${active ? "text-[#c9a96e]" : "text-gray-400"}`}>
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
