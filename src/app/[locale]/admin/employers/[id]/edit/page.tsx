import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { EmployerForm } from "../../employer-form";
import { updateEmployer, deleteEmployer } from "../../actions";

export default async function EditEmployerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("placement.manage");

  const employer = await prisma.employer.findUnique({ where: { id } });
  if (!employer) notFound();

  const districts = await districtOptions(locale);
  const t = await getTranslations("Employers");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <EmployerForm
        locale={locale}
        districts={districts}
        action={updateEmployer}
        defaults={{
          id: employer.id,
          name: employer.name,
          sector: employer.sector ?? "",
          contactPerson: employer.contactPerson ?? "",
          phone: employer.phone ?? "",
          email: employer.email ?? "",
          districtId: employer.districtId ?? "",
          note: employer.note ?? "",
        }}
      />

      <div className="max-w-md border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteEmployer}
          id={employer.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
