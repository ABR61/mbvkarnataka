"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { USER_STATUSES } from "@/lib/validation/user";
import type { FormState } from "@/lib/forms";

type Role = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function UserForm({
  locale,
  mode,
  roles,
  action,
  defaults = {},
}: {
  locale: string;
  mode: "create" | "edit";
  roles: Role[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    email?: string;
    name?: string;
    status?: string;
    userLocale?: string;
    roleIds?: string[];
  };
}) {
  const t = useTranslations("Users");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});
  const isCreate = mode === "create";
  const assigned = new Set(defaults.roleIds ?? []);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("email")} *</span>
        <input
          name="email"
          type="email"
          required={isCreate}
          readOnly={!isCreate}
          defaultValue={defaults.email}
          className={`${field} ${!isCreate ? "opacity-60" : ""}`}
        />
        {state.fieldErrors?.email && (
          <span className="text-red-600">{t(`emailError_${state.fieldErrors.email}`)}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("name")} *</span>
        <input name="name" required defaultValue={defaults.name} className={field} />
        {state.fieldErrors?.name && (
          <span className="text-red-600">{tc("required")}</span>
        )}
      </label>

      {isCreate ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("password")} *</span>
          <input name="password" type="password" required minLength={8} className={field} />
          {state.fieldErrors?.password && (
            <span className="text-red-600">{t("passwordMin")}</span>
          )}
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{tc("status")}</span>
          <select name="status" defaultValue={defaults.status ?? "ACTIVE"} className={field}>
            {USER_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`status_${s}`)}</option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("locale")}</span>
        <select name="userLocale" defaultValue={defaults.userLocale ?? "en"} className={field}>
          <option value="en">English</option>
          <option value="kn">ಕನ್ನಡ</option>
        </select>
      </label>

      <fieldset className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("roles")}</span>
        <div className="flex flex-wrap gap-3">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                name="roles"
                value={r.id}
                defaultChecked={assigned.has(r.id)}
              />
              {r.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/users" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
