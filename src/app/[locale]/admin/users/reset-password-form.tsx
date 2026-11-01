"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resetUserPassword } from "./actions";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

export function ResetPasswordForm({ locale, id }: { locale: string; id: string }) {
  const t = useTranslations("Users");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    resetUserPassword,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-md items-end gap-2">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <label className="flex flex-1 flex-col gap-1 text-sm">
        <span className="font-medium">{t("newPassword")}</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <FormError state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        {state.ok ? t("passwordReset") : t("resetPassword")}
      </button>
      {state.fieldErrors?.password && (
        <span className="text-sm text-red-600">{t("passwordMin")}</span>
      )}
    </form>
  );
}
