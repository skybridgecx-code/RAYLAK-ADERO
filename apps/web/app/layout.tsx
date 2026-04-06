import type { Metadata, Viewport } from "next";
import { Providers } from "~/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RAYLAK",
    template: "%s | RAYLAK",
  },
  description: "Premium transportation, reimagined.",
  robots: { index: false, follow: false }, // Set to true when public-ready
};

export const viewport: Viewport = {
  themeColor: "#0a0a1a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
