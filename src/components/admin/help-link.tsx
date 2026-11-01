"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

// Contextual help: links from whichever admin page you're on to its section of
// the How-to guide (/admin/help#<section>). Section ids match the first path
// segment after /admin, e.g. /admin/expenses/123/edit → #expenses.
export function HelpLink() {
  const t = useTranslations("Help");
  const pathname = usePathname(); // locale-less, e.g. "/admin/expenses/new"

  const segment = pathname.split("/")[2] ?? "";
  if (segment === "help") return null; // already on the guide

  const href = `/admin/help#${segment || "dashboard"}`;

  return (
    <Link
      href={href}
      title={t("helpForPage")}
      aria-label={t("helpForPage")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
    >
      ?
    </Link>
  );
}
