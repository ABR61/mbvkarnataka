import { getTranslations, setRequestLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// In-app how-to guide for the admin team. Static content (no data), bilingual,
// visible to every admin user. Start with the accounting workflow; add more
// module sections here over time.
export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Help");

  const step = (title: string, body: string) => (
    <Card className="flex-1">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{body}</p>
    </Card>
  );

  const note = (title: string, body: string) => (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{body}</p>
    </div>
  );

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
      </div>

      <section className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">{t("acctTitle")}</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t("acctIntro")}</p>
        </div>

        {/* Status flow */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge tone="amber">{t("step1Title")}</Badge>
          <span aria-hidden className="text-gray-400">→</span>
          <Badge tone="blue">{t("step2Title")}</Badge>
          <span aria-hidden className="text-gray-400">→</span>
          <Badge tone="green">{t("step3Title")}</Badge>
          <span aria-hidden className="mx-1 text-gray-300">|</span>
          <Badge tone="red">{t("voidTitle")}</Badge>
        </div>

        {/* Lifecycle steps */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {step(t("step1Title"), t("step1Body"))}
          {step(t("step2Title"), t("step2Body"))}
          {step(t("step3Title"), t("step3Body"))}
        </div>

        <div className="flex flex-col gap-5 border-t border-gray-200 pt-5 dark:border-gray-800">
          {note(t("sodTitle"), t("sodBody"))}
          {note(t("lockTitle"), t("lockBody"))}
          {note(t("voidTitle"), t("voidBody"))}
          {note(t("fundsTitle"), t("fundsBody"))}
          {note(t("budgetTitle"), t("budgetBody"))}
          {note(t("rolesTitle"), t("rolesBody"))}
        </div>
      </section>
    </div>
  );
}
