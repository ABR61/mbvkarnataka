"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import type { NavItem } from "@/components/admin/sidebar-links";

// "← Back to <section>" shown automatically on every admin sub-page (new,
// edit, import, detail, attendance…), linking to that section's list. Derived
// from the URL so individual pages don't each need their own back link.
export function AdminBackLink({ items }: { items: NavItem[] }) {
  const t = useTranslations("Admin");
  const pathname = usePathname(); // e.g. /admin/expenses/123/edit

  const [, admin, section, ...rest] = pathname.split("/");
  if (admin !== "admin" || !section || rest.length === 0) return null; // list pages & dashboard

  const parent = items.find((i) => i.href === `/admin/${section}`);
  if (!parent) return null; // section not in this user's menu (e.g. certificates)

  return (
    <Link
      href={parent.href}
      className="mb-4 inline-flex items-center gap-1 text-sm text-emerald-700 hover:underline dark:text-emerald-400 print:hidden"
    >
      <span aria-hidden>←</span> {t("backTo", { section: parent.label })}
    </Link>
  );
}
