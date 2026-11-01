"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { authenticate, type SignInState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

const initialState: SignInState = {};

export function SignInForm({
  locale,
  callbackUrl,
}: {
  locale: string;
  callbackUrl?: string;
}) {
  const t = useTranslations("SignIn");
  const [state, action, pending] = useActionState(authenticate, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {callbackUrl && (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      )}

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
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-20 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            {showPassword ? t("hidePassword") : t("showPassword")}
          </button>
        </div>
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error === "rate_limited"
            ? t("error.rate_limited", {
                minutes: Math.max(1, Math.ceil((state.retryAfter ?? 0) / 60)),
              })
            : t(`error.${state.error}`)}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? t("signingIn") : t("submit")}
      </Button>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t("forgotHint")}
      </p>
    </form>
  );
}
