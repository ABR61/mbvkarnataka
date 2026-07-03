import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClockWidget } from "@/components/public/clock-widget";

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
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center bg-gray-50 px-4 py-16 dark:bg-gray-950">
      <ClockWidget />
    </main>
  );
}
