import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClockWidget } from "@/components/public/clock-widget";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Clock" });
  return { title: t("title") };
}

export default async function ClockPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <main className="flex min-h-screen flex-1 flex-col bg-gray-50 dark:bg-gray-950">
      {/* A kiosk may be left in either language — let staff switch it. */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
          MBV
        </Link>
        <LocaleSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <ClockWidget />
      </div>
    </main>
  );
}
