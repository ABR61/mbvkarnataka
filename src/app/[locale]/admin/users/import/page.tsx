import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { ImportForm } from "@/components/admin/import-form";
import { importStaff } from "./actions";

export default async function ImportStaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("user.manage");

  const t = await getTranslations("Users");

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{t("importTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("importIntro")}</p>
      </div>
      <ImportForm
        locale={locale}
        action={importStaff}
        templateHref="/templates/staff-import.csv"
        columnsHint="name, email, password, roles (a;b), locale"
      />
    </div>
  );
}
