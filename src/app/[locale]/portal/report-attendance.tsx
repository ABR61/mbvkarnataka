"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ATTENDANCE_STATUSES } from "@/lib/validation/session";
import type { FormState } from "@/lib/forms";

// "Report a mistake" for one of the trainee's own marked sessions.
export function ReportAttendance({
  locale,
  sessionId,
  current,
  action,
}: {
  locale: string;
  sessionId: string;
  current: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Portal");
  const ta = useTranslations("Attendance");
  const [state, formAction, pending] = useActionState(action, {});

  if (state.ok) return <span className="text-xs text-emerald-700 dark:text-emerald-400">✓ {t("reportSent")}</span>;

  const field =
    "rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-emerald-700 hover:underline dark:text-emerald-400">{t("reportMistake")}</summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2 text-sm">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <label className="flex flex-col gap-1">
          <span>{t("shouldBe")}</span>
          <select name="toStatus" required defaultValue="" className={field}>
            <option value="" disabled>
              {ta("choose")}
            </option>
            {ATTENDANCE_STATUSES.filter((s) => s !== current).map((s) => (
              <option key={s} value={s}>
                {ta(`status_${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>{t("whatHappened")}</span>
          <textarea name="reason" required minLength={5} rows={2} className={field} />
        </label>
        {(state.error || state.fieldErrors?.reason) && (
          <p role="alert" className="text-red-600">
            {state.fieldErrors?.reason ? ta("err_reason") : ta(`err_${state.error}`)}
          </p>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {t("sendReport")}
          </button>
        </div>
      </form>
    </details>
  );
}
