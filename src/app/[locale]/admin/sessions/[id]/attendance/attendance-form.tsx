"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ATTENDANCE_STATUSES } from "@/lib/validation/session";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

type RosterRow = { personId: string; name: string; status: string };

export function AttendanceForm({
  locale,
  sessionId,
  roster,
  action,
}: {
  locale: string;
  sessionId: string;
  roster: RosterRow[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Attendance");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sessionId" value={sessionId} />

      <div>
        <button
          type="button"
          onClick={(e) => {
            const form = e.currentTarget.closest("form");
            form
              ?.querySelectorAll<HTMLSelectElement>("select[data-att]")
              .forEach((s) => {
                s.value = "PRESENT";
              });
          }}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("allPresent")}
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full max-w-xl text-sm">
        <tbody>
          {roster.map((r) => (
            <tr key={r.personId}>
              <td className={td}>{r.name}</td>
              <td className={`${td} w-40`}>
                <select
                  name={`status_${r.personId}`}
                  data-att
                  defaultValue={r.status}
                  className="w-full rounded-md border border-gray-300 px-2 py-1.5 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
                >
                  {ATTENDANCE_STATUSES.map((s) => (
                    <option key={s} value={s}>{t(`status_${s}`)}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <FormError state={state} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : t("saveAttendance")}
        </button>
        <Link href="/admin/sessions" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
