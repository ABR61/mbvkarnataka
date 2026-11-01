// Canonical public base URL, used for SEO metadata, sitemap, and robots.
// Override per-environment with NEXT_PUBLIC_SITE_URL (no trailing slash).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mbvkarnataka.org"
).replace(/\/$/, "");

// Public marketing routes (locale prefix is added per-locale). Keep in sync with
// the public header nav and the (public) route group.
export const PUBLIC_PATHS = [
  "",
  "/about",
  "/programs",
  "/future-programs",
  "/branches",
  "/contact",
  "/apply",
  "/verify",
] as const;
