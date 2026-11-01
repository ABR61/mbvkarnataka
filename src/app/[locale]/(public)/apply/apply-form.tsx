"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GENDERS } from "@/lib/validation/person";
import { CameraCapture } from "@/components/camera-capture";
import { Button } from "@/components/ui/button";
import { createApplication, type ApplyState } from "./actions";

type Option = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function ApplyForm({
  programs,
  districts,
  defaultProgramId = "",
  futureProgram,
}: {
  programs: Option[];
  districts: Option[];
  defaultProgramId?: string;
  futureProgram?: { id: string; title: string };
}) {
  const t = useTranslations("Apply");
  const tp = useTranslations("People");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState<ApplyState, FormData>(
    createApplication,
    {},
  );
  const [photo, setPhoto] = useState("");

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

      {futureProgram && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <span className="text-emerald-700 dark:text-emerald-300">
            {t("applyingFor")}:{" "}
          </span>
          <span className="font-semibold text-emerald-800 dark:text-emerald-200">
            {futureProgram.title}
          </span>
          <input type="hidden" name="futureProgramId" value={futureProgram.id} />
        </div>
      )}

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
          <span className="font-medium">{t("aadhaar")} *</span>
          <input
            name="aadhaarNumber"
            inputMode="numeric"
            maxLength={12}
            required
            placeholder={t("aadhaarHint")}
            className={field}
          />
          {state.fieldErrors?.aadhaarNumber && (
            <span className="text-sm text-red-600">{t("aadhaarInvalid")}</span>
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
        {!futureProgram && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("program")}</span>
            <select name="programId" defaultValue={defaultProgramId} className={field}>
              <option value="">—</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("photo")}</span>
        <span className="text-xs text-gray-500">{t("photoOptionalHint")}</span>
        <div className="mt-1">
          <CameraCapture onCapture={setPhoto} />
        </div>
        <input type="hidden" name="photoUrl" value={photo} />
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

      {state.error === "rate_limited" && (
        <p role="alert" className="text-sm text-red-600">
          {t("rateLimited")}
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
