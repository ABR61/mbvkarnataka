import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { DeleteButton } from "@/components/admin/delete-button";
import { ProgramForm } from "../../program-form";
import { updateProgram, deleteProgram } from "../../actions";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const program = await prisma.program.findUnique({ where: { id } });
  if (!program) notFound();

  const name = (program.name ?? {}) as { en?: string; kn?: string };
  const desc = (program.description ?? {}) as { en?: string; kn?: string };
  const t = await getTranslations("Programs");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <ProgramForm
        locale={locale}
        action={updateProgram}
        defaults={{
          id: program.id,
          nameEn: name.en ?? "",
          nameKn: name.kn ?? "",
          descEn: desc.en ?? "",
          descKn: desc.kn ?? "",
          category: program.category ?? "",
          durationWeeks: program.durationWeeks,
          status: program.status === "inactive" ? "inactive" : "active",
        }}
      />

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteProgram}
          id={program.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
