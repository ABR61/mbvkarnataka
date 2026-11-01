"use client";

import { Link, usePathname } from "@/i18n/navigation";

export type NavItem = { href: string; label: string };

// The admin navigation list, shared by the desktop sidebar and the mobile
// drawer. Highlights the current section and marks it aria-current for screen
// readers. "/admin" (dashboard) only matches exactly; every other item also
// matches its sub-pages (e.g. /admin/expenses/123/edit → Expenses).
export function SidebarLinks({
  items,
  onNavigate,
}: {
  items: NavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname(); // locale-less

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`block rounded-md px-3 py-2.5 text-sm transition md:py-2 ${
              active
                ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
