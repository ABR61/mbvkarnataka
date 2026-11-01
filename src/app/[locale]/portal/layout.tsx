import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guards";
import { signOutAction } from "@/app/actions/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requireAuth(`/${locale}/sign-in`);
  const t = await getTranslations("Portal");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-200 px-4 py-3 sm:px-6 dark:border-gray-800">
        <Link href="/" className="text-lg font-bold text-emerald-700">MBV</Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm sm:gap-x-4">
          <span className="font-medium">{t("myPortal")}</span>
          <Link href="/portal/help" className="text-gray-600 hover:text-emerald-700 hover:underline dark:text-gray-300">
            {t("help")}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
          <span className="hidden max-w-[12rem] truncate text-gray-600 md:inline dark:text-gray-400">
            {session.user.name ?? session.user.email}
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
