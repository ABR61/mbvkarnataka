"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BilingualField } from "@/components/forms/bilingual-field";
import { SESSION_STATUSES } from "@/lib/validation/session";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

type Option = { id: string; name: string };

export function SessionForm({
  locale,
  cohorts,
  courses,
  venues,
  trainers,
  action,
  defaults = {},
}: {
  locale: string;
  cohorts: Option[];
  courses: Option[];
  venues: Option[];
  trainers: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    cohortId?: string;
    courseId?: string;
    venueId?: string;
    trainerId?: string;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
    topicEn?: string;
    topicKn?: string;
    status?: string;
  };
}) {
  const t = useTranslations("Sessions");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";
  const reqMark = <span className="text-red-600"> *</span>;

  const select = (
    name: string,
    label: React.ReactNode,
    options: Option[],
    value?: string,
    required = false,
    placeholder = "—",
  ) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={value ?? ""} required={required} className={field}>
        <option value="" disabled={required}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      {required && state.fieldErrors?.[name] && (
        <span className="text-red-600">{tc("required")}</span>
      )}
    </label>
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      {select("cohortId", <>{t("cohort")}{reqMark}</>, cohorts, defaults.cohortId, true)}
      {select("courseId", <>{t("course")}{reqMark}</>, courses, defaults.courseId, true)}
      {select("venueId", t("venue"), venues, defaults.venueId)}
      {select("trainerId", t("trainer"), trainers, defaults.trainerId)}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("date")}{reqMark}</span>
        <input
          name="sessionDate"
          type="date"
          required
          defaultValue={defaults.sessionDate}
          className={field}
        />
        {state.fieldErrors?.sessionDate && (
          <span className="text-red-600">{tc("required")}</span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("startTime")}</span>
          <input name="startTime" type="time" defaultValue={defaults.startTime} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("endTime")}</span>
          <input name="endTime" type="time" defaultValue={defaults.endTime} className={field} />
        </label>
      </div>

      <BilingualField
        name="topic"
        label={t("topic")}
        defaultEn={defaults.topicEn}
        defaultKn={defaults.topicKn}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("status")}</span>
        <select name="status" defaultValue={defaults.status ?? "SCHEDULED"} className={field}>
          {SESSION_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status_${s}`)}</option>
          ))}
        </select>
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
        <Link href="/admin/sessions" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
