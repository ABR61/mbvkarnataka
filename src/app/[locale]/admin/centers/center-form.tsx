"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BilingualField } from "@/components/forms/bilingual-field";
import type { FormState } from "@/lib/forms";

type CenterDefaults = {
  id?: string;
  nameEn?: string;
  nameKn?: string;
  districtId?: string;
  address?: string;
  contactPhone?: string;
  status?: "ACTIVE" | "INACTIVE";
};

export function CenterForm({
  locale,
  districts,
  action,
  defaults = {},
}: {
  locale: string;
  districts: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: CenterDefaults;
}) {
  const t = useTranslations("Centers");
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

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {tc("district")}
          <span className="text-red-600"> *</span>
        </span>
        <select
          name="districtId"
          defaultValue={defaults.districtId ?? ""}
          required
          className={field}
        >
          <option value="" disabled>
            —
          </option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.districtId && (
          <span className="text-red-600">{tc("required")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("address")}</span>
        <input name="address" defaultValue={defaults.address} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("phone")}</span>
        <input
          name="contactPhone"
          defaultValue={defaults.contactPhone}
          className={field}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("status")}</span>
        <select
          name="status"
          defaultValue={defaults.status ?? "ACTIVE"}
          className={field}
        >
          <option value="ACTIVE">{tc("active")}</option>
          <option value="INACTIVE">{tc("inactive")}</option>
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
        <Link
          href="/admin/centers"
          className="text-sm text-gray-500 hover:underline"
        >
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
