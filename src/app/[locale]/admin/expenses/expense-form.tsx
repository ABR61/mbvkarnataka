"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

type Option = { id: string; name: string };

export function ExpenseForm({
  locale,
  programs,
  cohorts,
  centers,
  vendors,
  grants,
  districts,
  fixedDistrictName,
  action,
  defaults = {},
}: {
  locale: string;
  programs: Option[];
  cohorts: Option[];
  centers: Option[];
  vendors: Option[];
  grants: Option[];
  districts?: Option[];
  fixedDistrictName?: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    amount?: string;
    incurredOn?: string;
    category?: string;
    vendorId?: string;
    grantId?: string;
    note?: string;
    programId?: string;
    cohortId?: string;
    centerId?: string;
    districtId?: string;
  };
}) {
  const t = useTranslations("Expenses");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  const select = (name: string, label: string, options: Option[], value?: string) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <select name={name} defaultValue={value ?? ""} className={field}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
    </label>
  );

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("amount")} (₹) *</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            defaultValue={defaults.amount}
            placeholder="0.00"
            className={field}
          />
          {state.fieldErrors?.amount && (
            <span className="text-red-600">{t("amountInvalid")}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("date")} *</span>
          <input
            name="incurredOn"
            type="date"
            required
            defaultValue={defaults.incurredOn}
            className={field}
          />
          {state.fieldErrors?.incurredOn && (
            <span className="text-red-600">{tc("required")}</span>
          )}
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("category")}</span>
          <input
            name="category"
            defaultValue={defaults.category}
            list="expense-categories"
            className={field}
          />
          <datalist id="expense-categories">
            <option value="Salary" />
            <option value="Event" />
            <option value="Travel" />
            <option value="Materials" />
            <option value="Venue" />
            <option value="Utilities" />
            <option value="Training" />
            <option value="Other" />
          </datalist>
        </label>
        {select("vendorId", t("vendor"), vendors, defaults.vendorId)}
      </div>

      {/* District: a branch admin's is fixed to theirs; a super admin picks one. */}
      {fixedDistrictName ? (
        <p className="text-sm text-gray-500">
          {tc("district")}: <span className="font-medium">{fixedDistrictName}</span>
        </p>
      ) : (
        districts && select("districtId", tc("district"), districts, defaults.districtId)
      )}

      {select("grantId", t("grant"), grants, defaults.grantId)}

      {select("programId", t("program"), programs, defaults.programId)}
      <div className="grid grid-cols-2 gap-3">
        {select("cohortId", t("cohort"), cohorts, defaults.cohortId)}
        {select("centerId", t("center"), centers, defaults.centerId)}
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
        <Link href="/admin/expenses" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
