"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createTraineeLogin } from "./actions";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function TraineeLoginForm({ locale, id }: { locale: string; id: string }) {
  const t = useTranslations("Trainees");
  const tp = useTranslations("People");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTraineeLogin,
    {},
  );

  if (state.ok) {
    return <p className="text-sm text-emerald-700">{t("loginCreated")}</p>;
  }

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-gray-500">{t("loginHint")}</p>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tp("email")} *</span>
        <input name="email" type="email" required className={field} />
        {state.fieldErrors?.email && (
          <span className="text-red-600">{tp(`emailError_${state.fieldErrors.email}`)}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("password")} *</span>
        <input name="password" type="password" required minLength={8} className={field} />
        {state.fieldErrors?.password && (
          <span className="text-red-600">{t("passwordMin")}</span>
        )}
      </label>

      <FormError state={state} />
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {t("createLogin")}
      </button>
    </form>
  );
}
