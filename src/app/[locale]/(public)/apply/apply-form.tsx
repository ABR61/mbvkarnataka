"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GENDERS } from "@/lib/validation/person";
import { createApplication, type ApplyState } from "./actions";

type Option = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function ApplyForm({
  programs,
  districts,
  defaultProgramId = "",
}: {
  programs: Option[];
  districts: Option[];
  defaultProgramId?: string;
}) {
  const t = useTranslations("Apply");
  const tp = useTranslations("People");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(
    createApplication,
    {},
  );

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <h2 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
          {t("thanksTitle")}
        </h2>
        <p className="mt-2 text-emerald-700 dark:text-emerald-300">
          {t("thanksBody")}
        </p>
        <Link href="/programs" className="mt-4 inline-block text-sm text-emerald-700 hover:underline">
          {t("backToPrograms")}
        </Link>
      </div>
    );
  }

  const err = (key: string, msgKey?: string) =>
    state.fieldErrors?.[key] ? (
      <span className="text-sm text-red-600">{tc(msgKey ?? "required")}</span>
    ) : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute left-[-9999px] h-0 w-0"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tp("firstName")} *</span>
          <input name="firstName" required className={field} />
          {err("firstName")}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tp("lastName")}</span>
          <input name="lastName" className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("phone")} *</span>
          <input name="phone" required className={field} />
          {err("phone")}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tp("email")}</span>
          <input name="email" type="email" className={field} />
          {err("email", "required")}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tp("gender")}</span>
          <select name="gender" defaultValue="" className={field}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>{tp(`gender_${g}`)}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tp("dateOfBirth")}</span>
          <input name="dateOfBirth" type="date" className={field} />
          {state.fieldErrors?.dateOfBirth && (
            <span className="text-sm text-red-600">
              {tp(`dobError_${state.fieldErrors.dateOfBirth}`)}
            </span>
          )}
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("district")}</span>
          <select name="districtId" defaultValue="" className={field}>
            <option value="">—</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("program")}</span>
          <select name="programId" defaultValue={defaultProgramId} className={field}>
            <option value="">—</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("message")}</span>
        <textarea name="message" rows={3} className={field} />
      </label>

      <label className="flex items-start gap-2 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-800">
        <input type="checkbox" name="consent" className="mt-1" />
        <span>
          {t("consentLabel")}
          {state.fieldErrors?.consent && (
            <span className="block text-red-600">{t("consentRequired")}</span>
          )}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-600 px-6 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
