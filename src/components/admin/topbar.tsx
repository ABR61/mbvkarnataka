import { getTranslations } from "next-intl/server";
import { signOutAction } from "@/app/actions/auth";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

export async function Topbar({
  user,
  locale,
}: {
  user: { name?: string | null; email?: string | null };
  locale: string;
}) {
  const t = await getTranslations("Admin");

  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800 print:hidden">
      <span className="font-semibold">{t("title")}</span>
      <div className="flex items-center gap-4 text-sm">
        <Link
          href="/"
          className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("viewSite")}
        </Link>
        <LocaleSwitcher />
        <span className="text-gray-600 dark:text-gray-300">
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
