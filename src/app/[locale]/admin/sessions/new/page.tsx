import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import {
  cohortOptions,
  courseOptions,
  venueOptions,
  personOptions,
} from "@/lib/options";
import { SessionForm } from "../session-form";
import { createSession } from "../actions";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("session.manage");

  const [cohorts, courses, venues, trainers] = await Promise.all([
    cohortOptions(locale),
    courseOptions(locale),
    venueOptions(locale),
    personOptions(["TRAINER"]),
  ]);
  const t = await getTranslations("Sessions");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <SessionForm
        locale={locale}
        cohorts={cohorts}
        courses={courses}
        venues={venues}
        trainers={trainers}
        action={createSession}
      />
    </div>
  );
}
