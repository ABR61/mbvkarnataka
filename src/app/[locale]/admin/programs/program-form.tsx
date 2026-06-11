"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BilingualField } from "@/components/forms/bilingual-field";
import type { FormState } from "@/lib/forms";

export function ProgramForm({
  locale,
  action,
  defaults = {},
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    nameEn?: string;
    nameKn?: string;
    descEn?: string;
    descKn?: string;
    category?: string;
    durationWeeks?: number | null;
    status?: "active" | "inactive";
  };
}) {
  const t = useTranslations("Programs");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <BilingualField
        name="name"
        label={t("name")}
        defaultEn={defaults.nameEn}
        defaultKn={defaults.nameKn}
        required
        error={state.fieldErrors?.nameEn && tc("required")}
      />

      <BilingualField
        name="desc"
        label={t("description")}
        defaultEn={defaults.descEn}
        defaultKn={defaults.descKn}
        multiline
      />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("category")}</span>
        <input name="category" defaultValue={defaults.category} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("durationWeeks")}</span>
        <input
          name="durationWeeks"
          type="number"
          min={0}
          defaultValue={defaults.durationWeeks ?? ""}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("status")}</span>
        <select
          name="status"
          defaultValue={defaults.status ?? "active"}
          className={field}
        >
          <option value="active">{tc("active")}</option>
          <option value="inactive">{tc("inactive")}</option>
        </select>
      </label>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/programs" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
