"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PersonFields, type PersonDefaults } from "@/components/forms/person-fields";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

export function TraineeForm({
  locale,
  districts,
  action,
  defaults,
  showConsent = false,
}: {
  locale: string;
  districts: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: PersonDefaults & { id?: string };
  showConsent?: boolean;
}) {
  const t = useTranslations("People");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <PersonFields
        defaults={defaults}
        districts={districts}
        errors={state.fieldErrors}
      />

      {showConsent && (
        <label className="flex items-start gap-2 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
          <input type="checkbox" name="consent" className="mt-1" />
          <span>
            {t("consentLabel")}
            {state.fieldErrors?.consent && (
              <span className="block text-red-600">{t("consentRequired")}</span>
            )}
          </span>
        </label>
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
        <Link href="/admin/trainees" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
