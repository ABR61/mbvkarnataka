import { defineRouting } from "next-intl/routing";

// Supported languages for MBV: Kannada (primary region language) + English.
export const routing = defineRouting({
  locales: ["en", "kn"],
  defaultLocale: "en",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];
