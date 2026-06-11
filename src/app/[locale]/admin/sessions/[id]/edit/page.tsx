import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import {
  cohortOptions,
  courseOptions,
  venueOptions,
  personOptions,
} from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { SessionForm } from "../../session-form";
import { updateSession, deleteSession } from "../../actions";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("session.manage");

  const ts = await prisma.trainingSession.findUnique({ where: { id } });
  if (!ts) notFound();

  const [cohorts, courses, venues, trainers] = await Promise.all([
    cohortOptions(locale),
    courseOptions(locale),
    venueOptions(locale),
    personOptions(["TRAINER"]),
  ]);

  const topic = (ts.topic ?? {}) as { en?: string; kn?: string };
  const t = await getTranslations("Sessions");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <SessionForm
        locale={locale}
        cohorts={cohorts}
        courses={courses}
        venues={venues}
        trainers={trainers}
        action={updateSession}
        defaults={{
          id: ts.id,
          cohortId: ts.cohortId,
          courseId: ts.courseId,
          venueId: ts.venueId ?? "",
          trainerId: ts.trainerId ?? "",
          sessionDate: ts.sessionDate.toISOString().slice(0, 10),
          startTime: ts.startTime ?? "",
          endTime: ts.endTime ?? "",
          topicEn: topic.en ?? "",
          topicKn: topic.kn ?? "",
          status: ts.status,
        }}
      />

      <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteSession}
          id={ts.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
