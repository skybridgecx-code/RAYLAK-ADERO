import type { Metadata } from "next";
import { SiteHeader } from "@/components/website/site-header";
import { SiteFooter } from "@/components/website/site-footer";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://raylak.com";

export const metadata: Metadata = {
  title: {
    default: "RAYLAK — Premium Transportation | DC Metro Area",
    template: "%s | RAYLAK",
  },
  description:
    "Executive ground transportation serving Washington DC, Dulles, Reagan, and BWI. Airport transfers, corporate travel, hourly charter, and event transportation.",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    siteName: "RAYLAK",
    title: "RAYLAK — Premium Transportation",
    description:
      "Executive ground transportation serving Washington DC, Dulles, Reagan, and BWI. Available 24/7.",
    url: BASE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "RAYLAK — Premium Transportation",
    description: "Executive ground transportation serving Washington DC. Available 24/7.",
  },
};

export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">{children}</main>
      <SiteFooter />
    </div>
  );
}
