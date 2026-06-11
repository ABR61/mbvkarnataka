import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { personOptions, employerOptions } from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { PlacementForm } from "../../placement-form";
import { FollowUps } from "../../followups";
import { updatePlacement, deletePlacement } from "../../actions";

export default async function EditPlacementPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("placement.manage");

  const placement = await prisma.placement.findUnique({
    where: { id },
    include: { followUps: { orderBy: { followUpOn: "desc" } } },
  });
  if (!placement) notFound();

  const [trainees, employers] = await Promise.all([
    personOptions(["TRAINEE"]),
    employerOptions(),
  ]);
  const t = await getTranslations("Placements");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <PlacementForm
        locale={locale}
        trainees={trainees}
        employers={employers}
        action={updatePlacement}
        defaults={{
          id: placement.id,
          personId: placement.personId,
          employerId: placement.employerId,
          jobTitle: placement.jobTitle ?? "",
          employmentType: placement.employmentType ?? "",
          monthlySalary: placement.monthlySalary?.toString() ?? "",
          placedOn: placement.placedOn.toISOString().slice(0, 10),
          status: placement.status,
          note: placement.note ?? "",
        }}
      />

      <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
        <FollowUps
          locale={locale}
          placementId={placement.id}
          items={placement.followUps.map((f) => ({
            id: f.id,
            followUpOn: f.followUpOn.toISOString().slice(0, 10),
            periodMonths: f.periodMonths,
            stillEmployed: f.stillEmployed,
            monthlyIncome: f.monthlyIncome?.toString() ?? null,
            note: f.note,
          }))}
        />
      </div>

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deletePlacement}
          id={placement.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
