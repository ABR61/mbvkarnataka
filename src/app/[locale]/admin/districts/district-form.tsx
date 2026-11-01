"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BilingualField } from "@/components/forms/bilingual-field";
import type { FormState } from "@/lib/forms";
import { FormError } from "@/components/ui/form-error";

export function DistrictForm({
  locale,
  action,
  defaults,
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: {
    id: string;
    nameEn: string;
    nameKn: string;
    code: string;
    state: string;
  };
}) {
  const t = useTranslations("Districts");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={defaults.id} />

      <BilingualField
        name="name"
        label={t("name")}
        defaultEn={defaults.nameEn}
        defaultKn={defaults.nameKn}
        required
        error={state.fieldErrors?.nameEn && tc("required")}
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("code")}</span>
        <input name="code" defaultValue={defaults.code} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("state")}</span>
        <input name="state" defaultValue={defaults.state} className={field} />
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
        <Link href="/admin/districts" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
