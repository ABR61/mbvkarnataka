"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { setBudget } from "./actions";
import type { FormState } from "@/lib/forms";

export function BudgetRowForm({
  locale,
  programId,
  amount,
}: {
  locale: string;
  programId: string;
  amount: string;
}) {
  const t = useTranslations("Budgets");
  const [, formAction, pending] = useActionState<FormState, FormData>(setBudget, {});

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="programId" value={programId} />
      <span className="text-gray-400">₹</span>
      <input
        name="amount"
        inputMode="decimal"
        defaultValue={amount}
        placeholder="0.00"
        className="w-28 rounded-md border border-gray-300 px-2 py-1 text-sm tabular-nums outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-emerald-700 hover:underline disabled:opacity-50"
      >
        {t("set")}
      </button>
    </form>
  );
}
