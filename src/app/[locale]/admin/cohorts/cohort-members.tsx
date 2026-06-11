"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { ENROLLMENT_STATUSES } from "@/lib/validation/cohort";
import type { FormState } from "@/lib/forms";

type Option = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";
const btn =
  "rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60";

export function EnrollForm({
  locale,
  cohortId,
  candidates,
  action,
}: {
  locale: string;
  cohortId: string;
  candidates: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Cohorts");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cohortId" value={cohortId} />
      <select name="personId" required defaultValue="" className={field}>
        <option value="" disabled>
          {t("selectTrainee")}
        </option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <button type="submit" disabled={pending || candidates.length === 0} className={btn}>
        {t("enroll")}
      </button>
      {state.error && (
        <span className="text-sm text-red-600">{t(`enrollError_${state.error}`)}</span>
      )}
    </form>
  );
}

export function AssignTrainerForm({
  locale,
  cohortId,
  candidates,
  action,
}: {
  locale: string;
  cohortId: string;
  candidates: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Cohorts");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="cohortId" value={cohortId} />
      <select name="personId" required defaultValue="" className={field}>
        <option value="" disabled>
          {t("selectTrainer")}
        </option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <input name="role" placeholder={t("rolePlaceholder")} className={field} />
      <button type="submit" disabled={pending || candidates.length === 0} className={btn}>
        {t("assign")}
      </button>
      {state.error && (
        <span className="text-sm text-red-600">{t(`assignError_${state.error}`)}</span>
      )}
    </form>
  );
}

export function EnrollmentStatusForm({
  locale,
  id,
  cohortId,
  status,
  exitReason,
  action,
}: {
  locale: string;
  id: string;
  cohortId: string;
  status: string;
  exitReason: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Cohorts");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="cohortId" value={cohortId} />
      <select name="status" defaultValue={status} className={`${field} py-1`}>
        {ENROLLMENT_STATUSES.map((s) => (
          <option key={s} value={s}>{t(`enrollmentStatus_${s}`)}</option>
        ))}
      </select>
      <input
        name="exitReason"
        defaultValue={exitReason}
        placeholder={t("exitReason")}
        className={`${field} w-28 py-1`}
      />
      <button type="submit" disabled={pending} className="text-sm text-emerald-700 hover:underline disabled:opacity-50">
        {state.ok ? "✓" : t("set")}
      </button>
    </form>
  );
}
