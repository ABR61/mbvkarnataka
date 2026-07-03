"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";

type District = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function StaffForm({
  locale,
  action,
  districts,
  fixedDistrictName,
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  districts?: District[];
  fixedDistrictName?: string;
}) {
  const t = useTranslations("Staff");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("firstName")} *</span>
          <input name="firstName" required className={field} />
          {state.fieldErrors?.firstName && (
            <span className="text-red-600">{tc("required")}</span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("lastName")}</span>
          <input name="lastName" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("phone")}</span>
          <input name="phone" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("role")}</span>
          <input name="role" placeholder={t("roleHint")} className={field} />
        </label>
      </div>

      {fixedDistrictName ? (
        <p className="text-sm text-gray-500">
          {tc("district")}: <span className="font-medium">{fixedDistrictName}</span>
        </p>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("district")}</span>
          <select name="districtId" defaultValue="" className={field}>
            <option value="">—</option>
            {districts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/staff" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
