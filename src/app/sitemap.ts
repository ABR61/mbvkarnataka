import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { SITE_URL, PUBLIC_PATHS } from "@/lib/site";

// Sitemap for the bilingual public marketing site. Every public path is listed
// once per locale (localePrefix is "always"), with hreflang alternates so search
// engines serve the right language. Admin/portal routes are intentionally omitted.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map((path) => ({
    url: `${SITE_URL}/${routing.defaultLocale}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${SITE_URL}/${locale}${path}`]),
      ),
    },
  }));
}
