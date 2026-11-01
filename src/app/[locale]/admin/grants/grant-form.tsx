"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function GrantForm({
  locale,
  action,
  defaults = {},
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    funder?: string;
    amount?: string;
    reference?: string;
    receivedOn?: string;
    purpose?: string;
    restricted?: boolean;
    foreignSource?: boolean;
    note?: string;
  };
}) {
  const t = useTranslations("Grants");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("funder")} *</span>
        <input name="funder" required defaultValue={defaults.funder} className={field} />
        {state.fieldErrors?.funder && <span className="text-red-600">{tc("required")}</span>}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("amount")} (₹) *</span>
          <input name="amount" inputMode="decimal" required defaultValue={defaults.amount} placeholder="0.00" className={field} />
          {state.fieldErrors?.amount && <span className="text-red-600">{t("amountInvalid")}</span>}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("receivedOn")} *</span>
          <input name="receivedOn" type="date" required defaultValue={defaults.receivedOn} className={field} />
          {state.fieldErrors?.receivedOn && <span className="text-red-600">{tc("required")}</span>}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("reference")}</span>
        <input name="reference" defaultValue={defaults.reference} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("purpose")}</span>
        <input
          name="purpose"
          defaultValue={defaults.purpose}
          placeholder={t("purposeHint")}
          className={field}
        />
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="restricted"
          defaultChecked={defaults.restricted}
          className="mt-1"
        />
        <span>
          <span className="font-medium">{t("restricted")}</span>
          <span className="block text-xs text-gray-500">{t("restrictedHint")}</span>
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="foreignSource"
          defaultChecked={defaults.foreignSource}
          className="mt-1"
        />
        <span>
          <span className="font-medium">{t("foreignSource")}</span>
          <span className="block text-xs text-gray-500">{t("foreignSourceHint")}</span>
        </span>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("note")}</span>
        <textarea name="note" rows={2} defaultValue={defaults.note} className={field} />
      </label>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/grants" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
