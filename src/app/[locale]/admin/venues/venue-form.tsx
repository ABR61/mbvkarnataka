"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";

export function VenueForm({
  locale,
  centers,
  action,
  defaults = {},
}: {
  locale: string;
  centers: { id: string; name: string }[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: {
    id?: string;
    name?: string;
    centerId?: string;
    capacity?: number | null;
  };
}) {
  const t = useTranslations("Venues");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-base outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("name")}
          <span className="text-red-600"> *</span>
        </span>
        <input
          name="name"
          defaultValue={defaults.name}
          required
          className={field}
        />
        {state.fieldErrors?.name && (
          <span className="text-red-600">{tc("required")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">
          {t("center")}
          <span className="text-red-600"> *</span>
        </span>
        <select
          name="centerId"
          defaultValue={defaults.centerId ?? ""}
          required
          className={field}
        >
          <option value="" disabled>
            —
          </option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {state.fieldErrors?.centerId && (
          <span className="text-red-600">{tc("required")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("capacity")}</span>
        <input
          name="capacity"
          type="number"
          min={0}
          defaultValue={defaults.capacity ?? ""}
          className={field}
        />
      </label>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/venues" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
