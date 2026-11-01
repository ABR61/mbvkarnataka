"use client";

import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";

const KNOWN = ["notFound", "locked", "invalid", "saveFailed", "duplicate", "taken", "attendanceRecorded"] as const;

/**
 * Message shown beside a form's Save button when the server action fails, so a
 * submit never appears to "do nothing". Shows the action's error if there is
 * one; otherwise, if fields were rejected, points the user to them (on a long
 * phone form the field message may be scrolled out of view).
 */
export function FormError({ state }: { state: FormState | undefined }) {
  const t = useTranslations("Common");
  if (!state) return null;

  let message: string | null = null;
  if (state.error) {
    message = (KNOWN as readonly string[]).includes(state.error)
      ? t(`formError_${state.error as (typeof KNOWN)[number]}`)
      : t("formError_generic");
  } else if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
    message = t("formError_fields");
  }
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
    >
      {message}
    </p>
  );
}
