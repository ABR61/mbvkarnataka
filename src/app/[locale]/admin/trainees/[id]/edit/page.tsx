import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { TraineeForm } from "../../trainee-form";
import { updateTrainee, deleteTrainee } from "../../actions";

export default async function EditTraineePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("trainee.manage");

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person || person.kind !== "TRAINEE") notFound();

  const districts = await districtOptions(locale);
  const t = await getTranslations("Trainees");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <TraineeForm
        locale={locale}
        districts={districts}
        action={updateTrainee}
        defaults={{
          id: person.id,
          firstName: person.firstName,
          lastName: person.lastName ?? "",
          gender: person.gender ?? "",
          dateOfBirth: person.dateOfBirth?.toISOString().slice(0, 10) ?? "",
          phone: person.phone ?? "",
          email: person.email ?? "",
          address: person.address ?? "",
          districtId: person.districtId ?? "",
        }}
      />

      <div className="max-w-2xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteTrainee}
          id={person.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
