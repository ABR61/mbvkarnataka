import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Enables forbidden()/unauthorized() + forbidden.tsx for branded 403/401 pages.
  experimental: {
    authInterrupts: true,
    // Allow a post's inline photo (data URL) through Server Actions.
    serverActions: { bodySizeLimit: "5mb" },
  },
  // Let the dev server accept requests proxied through an https tunnel
  // (e.g. cloudflared *.trycloudflare.com) so the camera can be tested on a phone.
  allowedDevOrigins: ["*.trycloudflare.com"],
  // Activity/programme photos are served from Cloudflare R2 (see src/lib/storage.ts).
  // Allow next/image to optimize them; hosts are read from the R2 public base URL
  // so this tracks whatever domain the bucket is served from.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      ...(process.env.R2_PUBLIC_BASE_URL
        ? [
            {
              protocol: "https" as const,
              hostname: new URL(process.env.R2_PUBLIC_BASE_URL).hostname,
            },
          ]
        : []),
    ],
  },
  async redirects() {
    return [
      // The public activity gallery moved onto the home page. Locale-prefixed
      // because next-intl (not Next's built-in i18n) owns the /:locale segment.
      { source: "/:locale/reports", destination: "/:locale", permanent: false },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
