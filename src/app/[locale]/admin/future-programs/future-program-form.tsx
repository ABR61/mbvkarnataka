"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/forms";

type District = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

const MAX_IMAGE_BYTES = 1_500_000; // ~1.5 MB

export function FutureProgramForm({
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
  const t = useTranslations("FuturePrograms");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});
  const [image, setImage] = useState<string>("");
  const [imageError, setImageError] = useState<string>("");

  function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError("");
    const file = e.target.files?.[0];
    if (!file) {
      setImage("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setImageError(t("imageType"));
      e.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError(t("imageTooBig"));
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  }

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
        <span className="font-medium">{t("nameField")} *</span>
        <input name="title" required className={field} />
        {state.fieldErrors?.title && (
          <span className="text-red-600">{t("titleRequired")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("description")} *</span>
        <textarea name="description" required rows={4} className={field} />
        {state.fieldErrors?.description && (
          <span className="text-red-600">{t("descriptionRequired")}</span>
        )}
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("photo")}</span>
        <input
          type="file"
          accept="image/*"
          onChange={onPickImage}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700 hover:file:bg-emerald-100"
        />
        <span className="text-xs text-gray-500">{t("photoHint")}</span>
        {imageError && <span className="text-red-600">{imageError}</span>}
      </label>

      <input type="hidden" name="imageUrl" value={image} />

      {image && (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" className="max-h-48 w-full object-cover" />
        </div>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("objectives")}</span>
        <textarea name="objectives" rows={3} className={field} />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("resources")}</span>
        <textarea name="resources" rows={3} placeholder={t("resourcesHint")} className={field} />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("capacity")}</span>
          <input name="seats" type="number" min={1} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("duration")}</span>
          <div className="flex gap-2">
            <input
              name="durationWeeks"
              type="number"
              min={1}
              className={`${field} w-24`}
            />
            <select name="durationUnit" defaultValue="weeks" className={`${field} flex-1`}>
              <option value="days">{t("days")}</option>
              <option value="weeks">{t("weeks")}</option>
              <option value="months">{t("months")}</option>
            </select>
          </div>
        </label>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        <Link href="/admin/future-programs" className="text-sm text-gray-500 hover:underline">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
