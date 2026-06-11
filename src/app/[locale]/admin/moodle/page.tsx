import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { isMoodleConfigured, moodle } from "@/lib/moodle";

// Calls the external Moodle at render when configured → never prerender.
export const dynamic = "force-dynamic";

export default async function MoodleStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("user.manage");

  const t = await getTranslations("Moodle");

  type State =
    | { kind: "notConfigured" }
    | { kind: "connected"; sitename: string; username: string; release?: string }
    | { kind: "error"; message: string };

  let state: State = { kind: "notConfigured" };
  if (isMoodleConfigured()) {
    try {
      const info = await moodle.getSiteInfo();
      state = {
        kind: "connected",
        sitename: info.sitename,
        username: info.username,
        release: info.release,
      };
    } catch (e) {
      state = { kind: "error", message: e instanceof Error ? e.message : String(e) };
    }
  }

  const mappedCourses = await prisma.course.count({
    where: { moodleCourseId: { not: null } },
  });

  const badge =
    state.kind === "connected"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
      : state.kind === "error"
        ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 p-5 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{t("status")}</span>
          <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${badge}`}>
            {t(`state_${state.kind}`)}
          </span>
        </div>

        {state.kind === "connected" && (
          <dl className="text-sm text-gray-600 dark:text-gray-300">
            <div>{t("site")}: <strong>{state.sitename}</strong></div>
            <div>{t("wsUser")}: {state.username}</div>
            {state.release && <div>{t("release")}: {state.release}</div>}
          </dl>
        )}

        {state.kind === "error" && (
          <p className="text-sm text-red-600">{t("errorBody", { message: state.message })}</p>
        )}

        {state.kind === "notConfigured" && (
          <p className="text-sm text-gray-500">{t("notConfiguredBody")}</p>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 p-5 text-sm dark:border-gray-800">
        <div className="font-medium">{t("mapping")}</div>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          {t("mappedCount", { count: mappedCourses })}
        </p>
        <Link href="/admin/courses" className="mt-2 inline-block text-emerald-700 hover:underline">
          {t("manageCourses")} →
        </Link>
      </div>
    </div>
  );
}
