"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ATTENDANCE_STATUSES } from "@/lib/validation/session";
import type { FormState } from "@/lib/forms";

// "Request correction" for one trainee on a locked session. The change only
// takes effect once a different person approves it on the review page.
export function CorrectionForm({
  locale,
  sessionId,
  personId,
  current,
  action,
}: {
  locale: string;
  sessionId: string;
  personId: string;
  current: string | null;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Attendance");
  const [state, formAction, pending] = useActionState(action, {});

  if (state.ok) {
    return <span className="text-sm text-emerald-700 dark:text-emerald-400">✓ {t("correctionRequested")}</span>;
  }

  const field =
    "rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-emerald-700 hover:underline dark:text-emerald-400">
        {t("requestCorrection")}
      </summary>
      <form action={formAction} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="personId" value={personId} />
        <label className="flex flex-col gap-1">
          <span>{t("changeTo")}</span>
          <select name="toStatus" required defaultValue="" className={field}>
            <option value="" disabled>
              {t("choose")}
            </option>
            {ATTENDANCE_STATUSES.filter((s) => s !== current).map((s) => (
              <option key={s} value={s}>
                {t(`status_${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>{t("reason")}</span>
          <textarea name="reason" required minLength={5} rows={2} placeholder={t("reasonHint")} className={field} />
        </label>
        {(state.error || state.fieldErrors?.reason) && (
          <p role="alert" className="text-red-600">
            {state.fieldErrors?.reason ? t("err_reason") : t(`err_${state.error}`)}
          </p>
        )}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {t("sendForApproval")}
          </button>
        </div>
      </form>
    </details>
  );
}
