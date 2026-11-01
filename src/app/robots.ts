import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Allow crawling of the public site; keep the back-office and trainee portal out
// of search indexes. Points crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/*/admin/", "/*/portal/", "/*/sign-in", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
