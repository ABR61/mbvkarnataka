import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { completableProgramOptions, studentUserOptions } from "@/lib/options";
import { CompletionForm } from "../completion-form";
import { createCompletion } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCompletionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("feedback.manage");
  const t = await getTranslations("Completions");

  const [programs, students] = await Promise.all([
    completableProgramOptions(locale, scopedDistrictId(session)),
    studentUserOptions(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("newIntro")}</p>
      </div>
      <CompletionForm
        locale={locale}
        action={createCompletion}
        programs={programs}
        students={students}
      />
    </div>
  );
}
