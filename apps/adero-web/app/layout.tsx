import type { Metadata, Viewport } from "next";
import { AderoClerkProvider } from "@/components/adero-clerk-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Adero",
    template: "%s | Adero",
  },
  description: "Premium B2B dispatch network for luxury transportation",
  robots: {
    index: false,
    follow: false,
  },
  metadataBase: new URL(process.env["NEXT_PUBLIC_APP_URL"] ?? "https://adero.io"),
  openGraph: {
    siteName: "Adero",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AderoClerkProvider>{children}</AderoClerkProvider>
      </body>
    </html>
  );
}
