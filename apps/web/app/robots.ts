import type { MetadataRoute } from "next";

const BASE_URL = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://raylak.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard/", "/driver/", "/api/"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
