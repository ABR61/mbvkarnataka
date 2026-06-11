import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { VendorForm } from "../vendor-form";
import { createVendor } from "../actions";

export default async function NewVendorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");
  const t = await getTranslations("Vendors");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <VendorForm locale={locale} action={createVendor} />
    </div>
  );
}
