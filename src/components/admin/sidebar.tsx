import { getTranslations } from "next-intl/server";
import { hasPermission, type Permission } from "@/lib/rbac";
import { SidebarLinks, type NavItem } from "@/components/admin/sidebar-links";

// Nav items gated by permission. `permission: null` means always visible.
// Routes beyond /admin are built in later slices; links are wired ahead of them.
// Rarely-used/placeholder pages (venues, courses, budgets, vendors, employers,
// placements, moodle) are kept in the app but removed from the nav to keep the
// sidebar short. They remain reachable by URL if needed.
const NAV: { href: string; key: string; permission: Permission | null }[] = [
  { href: "/admin", key: "dashboard", permission: null },
  { href: "/admin/districts", key: "districts", permission: "center.manage" },
  { href: "/admin/centers", key: "centers", permission: "center.manage" },
  { href: "/admin/programs", key: "programs", permission: "cohort.manage" },
  { href: "/admin/cohorts", key: "cohorts", permission: "cohort.manage" },
  { href: "/admin/trainees", key: "trainees", permission: "trainee.manage" },
  { href: "/admin/trainers", key: "trainers", permission: "trainer.manage" },
  { href: "/admin/staff", key: "staff", permission: "staff.manage" },
  { href: "/admin/applications", key: "applications", permission: "application.manage" },
  { href: "/admin/posts", key: "posts", permission: "post.manage" },
  { href: "/admin/future-programs", key: "futurePrograms", permission: "program.plan" },
  { href: "/admin/completions", key: "completions", permission: "feedback.manage" },
  { href: "/admin/feedback", key: "feedback", permission: "feedback.manage" },
  { href: "/admin/sessions", key: "sessions", permission: "session.manage" },
  { href: "/admin/finance", key: "finance", permission: "finance.manage" },
  { href: "/admin/expenses", key: "expenses", permission: "expense.record" },
  { href: "/admin/grants", key: "grants", permission: "finance.manage" },
  { href: "/admin/reports", key: "reports", permission: "report.view" },
  { href: "/admin/users", key: "users", permission: "user.manage" },
  { href: "/admin/audit", key: "audit", permission: "user.manage" },
  { href: "/admin/help", key: "help", permission: null },
];

/** The nav links this user may see, labelled in their language. Computed once
 *  on the server and shared by the desktop sidebar and the mobile drawer. */
export async function adminNavItems(permissions: readonly string[]): Promise<NavItem[]> {
  const t = await getTranslations("Nav");
  return NAV.filter((item) => item.permission === null || hasPermission(permissions, item.permission)).map(
    (item) => ({ href: item.href, label: t(item.key) }),
  );
}

/** Desktop sidebar (md and up). Phones use MobileNav in the topbar instead. */
export function Sidebar({ items, brand }: { items: NavItem[]; brand: string }) {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-gray-200 p-3 md:block dark:border-gray-800 print:hidden">
      <div className="mb-4 px-3 py-2 text-lg font-bold text-emerald-700">{brand}</div>
      <SidebarLinks items={items} />
    </aside>
  );
}
