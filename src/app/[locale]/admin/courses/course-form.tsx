"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BilingualField } from "@/components/forms/bilingual-field";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

export function CourseForm({
  locale,
  programs,
  action,
  defaults = {},
}: {
  locale: string;
  programs: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    programId?: string;
    nameEn?: string;
    nameKn?: string;
    descEn?: string;
    descKn?: string;
    sequence?: number;
    hours?: number | null;
    moodleCourseId?: number | null;
  };
}) {
  const t = useTranslations("Courses");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("program")}
          <span className="text-red-600"> *</span>
        </span>
        <select
          name="programId"
          defaultValue={defaults.programId ?? ""}
          required
          className={field}
        >
          <option value="" disabled>
            —
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.programId && (
          <span className="text-red-600">{tc("required")}</span>
        )}
      </label>

      <BilingualField
        name="name"
        label={t("name")}
        defaultEn={defaults.nameEn}
        defaultKn={defaults.nameKn}
        required
        error={state.fieldErrors?.nameEn && tc("required")}
      />

      <BilingualField
        name="desc"
        label={t("description")}
        defaultEn={defaults.descEn}
        defaultKn={defaults.descKn}
        multiline
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("sequence")}</span>
          <input
            name="sequence"
            type="number"
            min={0}
            defaultValue={defaults.sequence ?? 0}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("hours")}</span>
          <input
            name="hours"
            type="number"
            min={0}
            defaultValue={defaults.hours ?? ""}
            className={field}
          />
        </label>
      </div>

      <label className="flex max-w-xs flex-col gap-1 text-sm">
        <span className="font-medium">{t("moodleCourseId")}</span>
        <input
          name="moodleCourseId"
          type="number"
          min={0}
          defaultValue={defaults.moodleCourseId ?? ""}
          className={field}
        />
        <span className="text-xs text-gray-400">{t("moodleHint")}</span>
      </label>

      <FormError state={state} />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/courses" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
