"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";

// Approve / reject one correction request (with an optional note; a note is
// required to reject, so the requester learns why).
export function ReviewForm({
  locale,
  id,
  action,
}: {
  locale: string;
  id: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("AttendanceReview");
  const [state, formAction, pending] = useActionState(action, {});

  if (state.ok) return <span className="text-sm text-emerald-700 dark:text-emerald-400">✓ {t("done")}</span>;

  return (
    <form action={formAction} className="flex flex-col gap-2 text-sm">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input
        name="note"
        placeholder={t("notePlaceholder")}
        aria-label={t("notePlaceholder")}
        className="rounded-md border border-gray-300 px-2 py-1.5 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {t("approve")}
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="rounded-md border border-red-300 px-3 py-1.5 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:hover:bg-red-950"
        >
          {t("reject")}
        </button>
      </div>
      {(state.error || state.fieldErrors?.note) && (
        <p role="alert" className="text-red-600">
          {state.fieldErrors?.note ? t("err_noteRequired") : t(`err_${state.error}`)}
        </p>
      )}
    </form>
  );
}
