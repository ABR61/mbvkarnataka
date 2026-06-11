import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";

// Marketing-site header: logo, public nav, language switch, staff sign-in.
export async function PublicHeader() {
  const t = await getTranslations("Public");

  return (
    <header className="border-b border-gray-200 dark:border-gray-800">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          MBV
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/programs" className="hover:text-emerald-700">
            {t("programs")}
          </Link>
          <Link
            href="/apply"
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            {t("apply")}
          </Link>
          <LocaleSwitcher />
          <Link href="/sign-in" className="text-gray-400 hover:text-emerald-700">
            {t("staffSignIn")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
