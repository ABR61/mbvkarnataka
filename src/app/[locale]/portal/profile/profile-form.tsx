"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { updateMyProfile } from "../actions";
import type { FormState } from "@/lib/forms";

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function ProfileForm({
  locale,
  defaults,
}: {
  locale: string;
  defaults: { phone: string; email: string; address: string };
}) {
  const t = useTranslations("Portal");
  const tp = useTranslations("People");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateMyProfile,
    {},
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("phone")}</span>
        <input name="phone" defaultValue={defaults.phone} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tp("email")}</span>
        <input name="email" type="email" defaultValue={defaults.email} className={field} />
        {state.fieldErrors?.email && (
          <span className="text-sm text-red-600">{tp("emailError_invalid")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("address")}</span>
        <textarea name="address" rows={2} defaultValue={defaults.address} className={field} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/portal" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
        {state.ok && <span className="text-sm text-emerald-700">{t("profileSaved")}</span>}
      </div>
    </form>
  );
}
