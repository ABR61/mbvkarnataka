"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/money";
import { addFollowUp, deleteFollowUp } from "./actions";
import type { FormState } from "@/lib/forms";
import { formatDate } from "@/lib/dates";
import { FormError } from "@/components/ui/form-error";

export type FollowUpRow = {
  id: string;
  followUpOn: string;
  periodMonths: number | null;
  stillEmployed: boolean;
  monthlyIncome: string | null;
  note: string | null;
};

const field =
  "rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function FollowUps({
  locale,
  placementId,
  items,
}: {
  locale: string;
  placementId: string;
  items: FollowUpRow[];
}) {
  const t = useTranslations("FollowUps");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState<FormState, FormData>(addFollowUp, {});

  const th = "px-2 py-1 text-left font-medium text-gray-500";
  const td = "px-2 py-1 border-t border-gray-100 dark:border-gray-800";

  return (
    <section className="flex max-w-2xl flex-col gap-3">
      <h2 className="text-lg font-semibold">{t("title")}</h2>

      {items.length > 0 && (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className={th}>{t("date")}</th>
              <th className={th}>{t("period")}</th>
              <th className={th}>{t("employed")}</th>
              <th className={th}>{t("income")}</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((f) => (
              <tr key={f.id}>
                <td className={td}>{formatDate(f.followUpOn, locale)}</td>
                <td className={td}>{f.periodMonths != null ? t("months", { n: f.periodMonths }) : "—"}</td>
                <td className={td}>{f.stillEmployed ? t("yes") : t("no")}</td>
                <td className={`${td} tabular-nums`}>
                  {f.monthlyIncome ? formatINR(f.monthlyIncome) : "—"}
                </td>
                <td className={td}>
                  <form action={deleteFollowUp}>
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="placementId" value={placementId} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      onClick={(e) => {
                        if (!window.confirm(tc("confirmDelete"))) e.preventDefault();
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      {tc("delete")}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="placementId" value={placementId} />
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("date")} *</span>
          <input name="followUpOn" type="date" required className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("periodShort")}</span>
          <input name="periodMonths" inputMode="numeric" placeholder="6" className={`${field} w-20`} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("employed")}</span>
          <select name="stillEmployed" defaultValue="true" className={field}>
            <option value="true">{t("yes")}</option>
            <option value="false">{t("no")}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("income")} (₹)</span>
          <input name="monthlyIncome" inputMode="decimal" placeholder="0.00" className={`${field} w-28`} />
        </label>
        <FormError state={state} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : t("add")}
        </button>
        {state.fieldErrors?.monthlyIncome && (
          <span className="text-sm text-red-600">{t("incomeInvalid")}</span>
        )}
      </form>
    </section>
  );
}
