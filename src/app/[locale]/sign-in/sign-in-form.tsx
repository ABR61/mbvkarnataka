"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { authenticate, type SignInState } from "@/app/actions/auth";

const initialState: SignInState = {};

export function SignInForm({ locale }: { locale: string }) {
  const t = useTranslations("SignIn");
  const [state, action, pending] = useActionState(authenticate, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1 text-sm">
        {t("email")}
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        {t("password")}
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {t(`error.${state.error}`)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? t("signingIn") : t("submit")}
      </button>
    </form>
  );
}
