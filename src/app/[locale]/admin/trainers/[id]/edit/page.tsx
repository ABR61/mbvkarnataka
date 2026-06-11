import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { TrainerForm } from "../../trainer-form";
import { updateTrainer, deleteTrainer } from "../../actions";

export default async function EditTrainerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("trainer.manage");

  const person = await prisma.person.findUnique({ where: { id } });
  if (!person || person.kind !== "TRAINER") notFound();

  const districts = await districtOptions(locale);
  const t = await getTranslations("Trainers");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <TrainerForm
        locale={locale}
        districts={districts}
        action={updateTrainer}
        mode="edit"
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
          action={deleteTrainer}
          id={person.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
