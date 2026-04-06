import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@raylak/ui", "@raylak/shared", "@raylak/db"],

  experimental: {
    // Enables the React 19 compiler
    reactCompiler: false,
  },

  images: {
    remotePatterns: [
      // AWS CloudFront CDN — configured in Phase X
      // { protocol: "https", hostname: "cdn.raylak.com" },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
