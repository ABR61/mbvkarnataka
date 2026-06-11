import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { GrantForm } from "../grant-form";
import { createGrant } from "../actions";

export default async function NewGrantPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");
  const t = await getTranslations("Grants");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <GrantForm locale={locale} action={createGrant} />
    </div>
  );
}
