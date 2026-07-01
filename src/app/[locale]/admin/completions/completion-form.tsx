"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";

type Option = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function CompletionForm({
  locale,
  action,
  programs,
  students,
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  programs: Option[];
  students: Option[];
}) {
  const t = useTranslations("Completions");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("program")} *</span>
        <select name="programRef" defaultValue="" className={field}>
          <option value="" disabled>
            {t("selectProgram")}
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.programRef && (
          <span className="text-red-600">{t("required")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("participant")} *</span>
        <select name="userId" defaultValue="" className={field}>
          <option value="" disabled>
            {t("selectParticipant")}
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.userId && (
          <span className="text-red-600">{t("required")}</span>
        )}
      </label>

      {state.error === "duplicate" && (
        <p className="text-sm text-amber-700">{t("duplicate")}</p>
      )}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/completions" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
