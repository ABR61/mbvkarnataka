import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { HelpLink } from "@/components/admin/help-link";
import { MobileNav } from "@/components/admin/mobile-nav";
import type { NavItem } from "@/components/admin/sidebar-links";

export async function Topbar({
  user,
  locale,
  navItems,
}: {
  user: { name?: string | null; email?: string | null };
  locale: string;
  navItems: NavItem[];
}) {
  const t = await getTranslations("Admin");

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3 md:px-6 dark:border-gray-800 print:hidden">
      <div className="flex items-center gap-3">
        <MobileNav items={navItems} menuLabel={t("menu")} closeLabel={t("closeMenu")} brand="MBV" />
        <span className="font-semibold">{t("title")}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm md:gap-4">
        <Link
          href="/"
          className="hidden rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 sm:inline-block dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("viewSite")}
        </Link>
        <LocaleSwitcher />
        <ThemeToggle />
        <HelpLink />
        <span className="hidden max-w-[12rem] truncate text-gray-600 lg:inline dark:text-gray-300">
          {user.name ?? user.email}
        </span>
        <form action={signOutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {t("signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
