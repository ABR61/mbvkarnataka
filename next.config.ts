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
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
