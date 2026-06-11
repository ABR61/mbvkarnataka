"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function VendorForm({
  locale,
  action,
  defaults = {},
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    name?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    note?: string;
  };
}) {
  const t = useTranslations("Vendors");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("name")} *</span>
        <input name="name" required defaultValue={defaults.name} className={field} />
        {state.fieldErrors?.name && <span className="text-red-600">{tc("required")}</span>}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("contactPerson")}</span>
        <input name="contactPerson" defaultValue={defaults.contactPerson} className={field} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("phone")}</span>
          <input name="phone" defaultValue={defaults.phone} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("email")}</span>
          <input name="email" type="email" defaultValue={defaults.email} className={field} />
          {state.fieldErrors?.email && (
            <span className="text-red-600">{t("emailInvalid")}</span>
          )}
        </label>
      </div>

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
        <Link href="/admin/vendors" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
