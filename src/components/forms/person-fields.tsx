"use client";

import { useTranslations } from "next-intl";
import { GENDERS } from "@/lib/validation/person";

export type PersonDefaults = {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string; // YYYY-MM-DD
  phone?: string;
  email?: string;
  address?: string;
  districtId?: string;
};

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function PersonFields({
  defaults = {},
  districts,
  errors = {},
  emailRequired = false,
  emailReadOnly = false,
}: {
  defaults?: PersonDefaults;
  districts: { id: string; name: string }[];
  errors?: Record<string, string>;
  emailRequired?: boolean;
  emailReadOnly?: boolean;
}) {
  const t = useTranslations("People");
  const tc = useTranslations("Common");

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {t("firstName")}
            <span className="text-red-600"> *</span>
          </span>
          <input
            name="firstName"
            defaultValue={defaults.firstName}
            required
            className={field}
          />
          {errors.firstName && <span className="text-red-600">{tc("required")}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("lastName")}</span>
          <input name="lastName" defaultValue={defaults.lastName} className={field} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("gender")}</span>
          <select name="gender" defaultValue={defaults.gender ?? ""} className={field}>
            <option value="">—</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {t(`gender_${g}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("dateOfBirth")}</span>
          <input
            name="dateOfBirth"
            type="date"
            defaultValue={defaults.dateOfBirth}
            className={field}
          />
          {errors.dateOfBirth && (
            <span className="text-red-600">{t(`dobError_${errors.dateOfBirth}`)}</span>
          )}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("phone")}</span>
          <input name="phone" defaultValue={defaults.phone} className={field} />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">
            {t("email")}
            {emailRequired && <span className="text-red-600"> *</span>}
          </span>
          <input
            name="email"
            type="email"
            defaultValue={defaults.email}
            required={emailRequired}
            readOnly={emailReadOnly}
            className={`${field} ${emailReadOnly ? "opacity-60" : ""}`}
          />
          {errors.email && (
            <span className="text-red-600">{t(`emailError_${errors.email}`)}</span>
          )}
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("district")}</span>
        <select
          name="districtId"
          defaultValue={defaults.districtId ?? ""}
          className={field}
        >
          <option value="">—</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("address")}</span>
        <textarea
          name="address"
          defaultValue={defaults.address}
          rows={2}
          className={field}
        />
      </label>
    </>
  );
}
