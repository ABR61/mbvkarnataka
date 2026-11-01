import type { MetadataRoute } from "next";

// Web app manifest — makes the site installable on phones (home-screen icon,
// standalone window). Icons use a scalable SVG plus the existing favicon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MBV — Manava Bandhutva Vedike",
    short_name: "MBV",
    description: "Free occupational training for youth across Karnataka, India.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
      { src: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
  };
}
