import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { VerifyForm } from "@/components/public/verify-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Verify" });
  return { title: t("prompt") };
}

export default async function VerifyLandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Verify");

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">{t("prompt")}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">{t("instruction")}</p>
      <div className="mt-8 w-full">
        <VerifyForm
          codeLabel={t("codeLabel")}
          placeholder={t("codePlaceholder")}
          buttonLabel={t("verifyButton")}
        />
      </div>
    </main>
  );
}
