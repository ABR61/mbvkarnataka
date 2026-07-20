"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ImagePicker } from "@/components/image-picker";
import type { FormState } from "@/lib/forms";

type District = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function PostForm({
  locale,
  action,
  districts,
  fixedDistrictName,
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  // When the author is a branch admin, the district is fixed and not chosen here.
  districts?: District[];
  fixedDistrictName?: string;
}) {
  const t = useTranslations("Posts");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});
  const [image, setImage] = useState<string>("");

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      {fixedDistrictName ? (
        <p className="text-sm text-gray-500">
          {t("district")}: <span className="font-medium">{fixedDistrictName}</span>
        </p>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("district")} *</span>
          <select name="districtId" defaultValue="" className={field}>
            <option value="" disabled>
              {t("selectDistrict")}
            </option>
            {districts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.districtId && (
            <span className="text-red-600">{t("districtRequired")}</span>
          )}
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("titleField")} *</span>
        <input name="title" required className={field} />
        {state.fieldErrors?.title && (
          <span className="text-red-600">{t("titleRequired")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("description")} *</span>
        <textarea name="body" required rows={6} className={field} />
        {state.fieldErrors?.body && (
          <span className="text-red-600">{t("bodyRequired")}</span>
        )}
      </label>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("photo")}</span>
        <span className="text-xs text-gray-500">{t("photoHint")}</span>
        <div className="mt-1">
          <ImagePicker kind="post" value={image} onChange={setImage} />
        </div>
      </div>

      {/* Carries the stored image URL (or data URL fallback) to the action. */}
      <input type="hidden" name="imageUrl" value={image} />

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/posts" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
