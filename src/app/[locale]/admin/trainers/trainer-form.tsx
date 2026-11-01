"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PersonFields, type PersonDefaults } from "@/components/forms/person-fields";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

export function TrainerForm({
  locale,
  districts,
  action,
  defaults,
  mode,
}: {
  locale: string;
  districts: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: PersonDefaults & { id?: string };
  mode: "create" | "edit";
}) {
  const t = useTranslations("Trainers");
  const tp = useTranslations("People");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});
  const isCreate = mode === "create";

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <PersonFields
        defaults={defaults}
        districts={districts}
        errors={state.fieldErrors}
        emailRequired={isCreate}
        emailReadOnly={!isCreate}
      />

      {isCreate ? (
        <label className="flex max-w-sm flex-col gap-1 text-sm">
          <span className="font-medium">
            {t("password")}
            <span className="text-red-600"> *</span>
          </span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={field}
          />
          {state.fieldErrors?.password && (
            <span className="text-red-600">{t("passwordMin")}</span>
          )}
          <span className="text-xs text-gray-400">{t("loginHint")}</span>
        </label>
      ) : (
        <p className="text-xs text-gray-400">{t("emailLocked")}</p>
      )}

      <FormError state={state} />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/trainers" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>

      {state.fieldErrors?.email === "taken" && (
        <p className="text-sm text-red-600">{tp("emailError_taken")}</p>
      )}
    </form>
  );
}
