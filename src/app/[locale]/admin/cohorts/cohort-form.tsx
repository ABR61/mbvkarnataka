"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { COHORT_STATUSES } from "@/lib/validation/cohort";
import type { FormState } from "@/lib/forms";

type Option = { id: string; name: string };

export function CohortForm({
  locale,
  programs,
  centers,
  coordinators,
  action,
  defaults = {},
}: {
  locale: string;
  programs: Option[];
  centers: Option[];
  coordinators: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    programId?: string;
    centerId?: string;
    coordinatorId?: string;
    code?: string;
    startDate?: string;
    endDate?: string;
    capacity?: number | null;
    status?: string;
  };
}) {
  const t = useTranslations("Cohorts");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  const req = (key?: string) =>
    state.fieldErrors?.[key ?? ""] ? (
      <span className="text-red-600">{tc("required")}</span>
    ) : null;

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("program")}
          <span className="text-red-600"> *</span>
        </span>
        <select name="programId" defaultValue={defaults.programId ?? ""} required className={field}>
          <option value="" disabled>—</option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {req("programId")}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("center")}
          <span className="text-red-600"> *</span>
        </span>
        <select name="centerId" defaultValue={defaults.centerId ?? ""} required className={field}>
          <option value="" disabled>—</option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {req("centerId")}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("coordinator")}</span>
        <select name="coordinatorId" defaultValue={defaults.coordinatorId ?? ""} className={field}>
          <option value="">—</option>
          {coordinators.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("code")}</span>
          <input name="code" defaultValue={defaults.code} className={field} />
          {state.fieldErrors?.code === "taken" && (
            <span className="text-red-600">{t("codeTaken")}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("capacity")}</span>
          <input name="capacity" type="number" min={0} defaultValue={defaults.capacity ?? ""} className={field} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("startDate")}</span>
          <input name="startDate" type="date" defaultValue={defaults.startDate} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("endDate")}</span>
          <input name="endDate" type="date" defaultValue={defaults.endDate} className={field} />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("status")}</span>
        <select name="status" defaultValue={defaults.status ?? "PLANNED"} className={field}>
          {COHORT_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status_${s}`)}</option>
          ))}
        </select>
      </label>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/cohorts" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
