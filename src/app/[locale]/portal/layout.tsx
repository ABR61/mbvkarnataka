import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth-guards";
import { signOutAction } from "@/app/actions/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
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
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3 dark:border-gray-800">
        <span className="text-lg font-bold text-emerald-700">MBV</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium">{t("myPortal")}</span>
          <LocaleSwitcher />
          <ThemeToggle />
          <span className="text-gray-500">
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
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
