"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { Option } from "@/lib/options";
import { PLACEMENT_STATUSES, EMPLOYMENT_TYPES } from "@/lib/validation/placement";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function PlacementForm({
  locale,
  trainees,
  employers,
  action,
  defaults = {},
}: {
  locale: string;
  trainees: Option[];
  employers: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    personId?: string;
    employerId?: string;
    jobTitle?: string;
    employmentType?: string;
    monthlySalary?: string;
    placedOn?: string;
    status?: string;
    note?: string;
  };
}) {
  const t = useTranslations("Placements");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("trainee")} *</span>
          <select name="personId" required defaultValue={defaults.personId ?? ""} className={field}>
            <option value="">—</option>
            {trainees.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {state.fieldErrors?.personId && <span className="text-red-600">{tc("required")}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("employer")} *</span>
          <select name="employerId" required defaultValue={defaults.employerId ?? ""} className={field}>
            <option value="">—</option>
            {employers.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          {state.fieldErrors?.employerId && <span className="text-red-600">{tc("required")}</span>}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("jobTitle")}</span>
          <input name="jobTitle" defaultValue={defaults.jobTitle} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("employmentType")}</span>
          <select name="employmentType" defaultValue={defaults.employmentType ?? ""} className={field}>
            <option value="">—</option>
            {EMPLOYMENT_TYPES.map((e) => (
              <option key={e} value={e}>{t(`type_${e}`)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("monthlySalary")} (₹)</span>
          <input name="monthlySalary" inputMode="decimal" defaultValue={defaults.monthlySalary} placeholder="0.00" className={field} />
          {state.fieldErrors?.monthlySalary && <span className="text-red-600">{t("salaryInvalid")}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("placedOn")} *</span>
          <input name="placedOn" type="date" required defaultValue={defaults.placedOn} className={field} />
          {state.fieldErrors?.placedOn && <span className="text-red-600">{tc("required")}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("status")}</span>
          <select name="status" defaultValue={defaults.status ?? "PLACED"} className={field}>
            {PLACEMENT_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status_${s}`)}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("note")}</span>
        <textarea name="note" rows={2} defaultValue={defaults.note} className={field} />
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
        <Link href="/admin/placements" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
