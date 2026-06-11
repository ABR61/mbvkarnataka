import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import {
  programOptions,
  centerOptions,
  personOptions,
} from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { CohortForm } from "../../cohort-form";
import { EnrollForm, AssignTrainerForm } from "../../cohort-members";
import {
  updateCohort,
  deleteCohort,
  enrollTrainee,
  unenrollTrainee,
  assignTrainer,
  unassignTrainer,
} from "../../actions";

const personName = (p: { firstName: string; lastName: string | null }) =>
  [p.firstName, p.lastName].filter(Boolean).join(" ");

const toDate = (d: Date | null) => d?.toISOString().slice(0, 10) ?? "";

export default async function EditCohortPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      enrollments: { include: { person: true }, orderBy: { enrolledOn: "asc" } },
      trainerAssignments: { include: { person: true } },
    },
  });
  if (!cohort) notFound();

  const [programs, centers, coordinators, allTrainees, allTrainers] =
    await Promise.all([
      programOptions(locale),
      centerOptions(locale),
      personOptions(["TRAINER", "STAFF"]),
      personOptions(["TRAINEE"]),
      personOptions(["TRAINER"]),
    ]);

  const enrolledIds = new Set(cohort.enrollments.map((e) => e.personId));
  const assignedIds = new Set(cohort.trainerAssignments.map((a) => a.personId));
  const enrollCandidates = allTrainees.filter((t) => !enrolledIds.has(t.id));
  const assignCandidates = allTrainers.filter((t) => !assignedIds.has(t.id));

  const t = await getTranslations("Cohorts");
  const tc = await getTranslations("Common");

  const atCapacity =
    cohort.capacity != null && cohort.enrollments.length >= cohort.capacity;

  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">
          {t("editTitle")}
          {cohort.code ? ` · ${cohort.code}` : ""}
        </h1>
        <CohortForm
          locale={locale}
          programs={programs}
          centers={centers}
          coordinators={coordinators}
          action={updateCohort}
          defaults={{
            id: cohort.id,
            programId: cohort.programId,
            centerId: cohort.centerId,
            coordinatorId: cohort.coordinatorId ?? "",
            code: cohort.code ?? "",
            startDate: toDate(cohort.startDate),
            endDate: toDate(cohort.endDate),
            capacity: cohort.capacity,
            status: cohort.status,
          }}
        />
      </div>

      {/* Enrollments */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          {t("enrollments")} ({cohort.enrollments.length}
          {cohort.capacity != null ? ` / ${cohort.capacity}` : ""})
        </h2>

        {cohort.enrollments.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noEnrollments")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {cohort.enrollments.map((e) => (
                <tr key={e.id}>
                  <td className={td}>{personName(e.person)}</td>
                  <td className={`${td} text-gray-500`}>{e.status}</td>
                  <td className={`${td} text-right`}>
                    <form action={unenrollTrainee} className="inline">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="cohortId" value={cohort.id} />
                      <button type="submit" className="text-red-600 hover:underline">
                        {t("remove")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {atCapacity ? (
          <p className="text-sm text-amber-600">{t("atCapacity")}</p>
        ) : (
          <EnrollForm
            locale={locale}
            cohortId={cohort.id}
            candidates={enrollCandidates}
            action={enrollTrainee}
          />
        )}
      </section>

      {/* Trainer assignments */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t("trainers")}</h2>

        {cohort.trainerAssignments.length === 0 ? (
          <p className="text-sm text-gray-400">{t("noTrainers")}</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {cohort.trainerAssignments.map((a) => (
                <tr key={a.id}>
                  <td className={td}>{personName(a.person)}</td>
                  <td className={`${td} text-gray-500`}>{a.role ?? "—"}</td>
                  <td className={`${td} text-right`}>
                    <form action={unassignTrainer} className="inline">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="cohortId" value={cohort.id} />
                      <button type="submit" className="text-red-600 hover:underline">
                        {t("remove")}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <AssignTrainerForm
          locale={locale}
          cohortId={cohort.id}
          candidates={assignCandidates}
          action={assignTrainer}
        />
      </section>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteCohort}
          id={cohort.id}
          locale={locale}
          label={t("deleteCohort")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
