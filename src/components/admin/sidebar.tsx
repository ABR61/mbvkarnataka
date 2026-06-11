import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Can } from "@/components/Can";
import type { Permission } from "@/lib/rbac";

// Nav items gated by permission. `permission: null` means always visible.
// Routes beyond /admin are built in later slices; links are wired ahead of them.
const NAV: { href: string; key: string; permission: Permission | null }[] = [
  { href: "/admin", key: "dashboard", permission: null },
  { href: "/admin/districts", key: "districts", permission: "center.manage" },
  { href: "/admin/centers", key: "centers", permission: "center.manage" },
  { href: "/admin/venues", key: "venues", permission: "center.manage" },
  { href: "/admin/programs", key: "programs", permission: "cohort.manage" },
  { href: "/admin/courses", key: "courses", permission: "cohort.manage" },
  { href: "/admin/cohorts", key: "cohorts", permission: "cohort.manage" },
  { href: "/admin/trainees", key: "trainees", permission: "trainee.manage" },
  { href: "/admin/trainers", key: "trainers", permission: "trainer.manage" },
  { href: "/admin/applications", key: "applications", permission: "application.manage" },
  { href: "/admin/sessions", key: "sessions", permission: "session.manage" },
  { href: "/admin/expenses", key: "expenses", permission: "finance.manage" },
  { href: "/admin/budgets", key: "budgets", permission: "finance.manage" },
  { href: "/admin/vendors", key: "vendors", permission: "finance.manage" },
  { href: "/admin/grants", key: "grants", permission: "finance.manage" },
  { href: "/admin/employers", key: "employers", permission: "placement.manage" },
  { href: "/admin/placements", key: "placements", permission: "placement.manage" },
  { href: "/admin/reports", key: "reports", permission: "report.view" },
  { href: "/admin/users", key: "users", permission: "user.manage" },
  { href: "/admin/moodle", key: "moodle", permission: "user.manage" },
];

export async function Sidebar() {
  const t = await getTranslations("Nav");

  const link = (href: string, key: string) => (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-gray-200 dark:hover:bg-gray-800"
    >
      {t(key)}
    </Link>
  );

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 p-3 dark:border-gray-800 print:hidden">
      <div className="mb-4 px-3 py-2 text-lg font-bold text-emerald-700">MBV</div>
      <nav className="flex flex-col gap-1">
        {NAV.map((item) =>
          item.permission === null ? (
            <div key={item.href}>{link(item.href, item.key)}</div>
          ) : (
            <Can key={item.href} permission={item.permission}>
              {link(item.href, item.key)}
            </Can>
          ),
        )}
      </nav>
    </aside>
  );
}
