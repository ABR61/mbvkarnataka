"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";
import { useActionToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

export function FeedbackForm({
  locale,
  action,
  completionId,
  currentRating,
  currentComment,
}: {
  locale: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  completionId: string;
  currentRating?: number;
  currentComment?: string;
}) {
  const t = useTranslations("PortalFeedback");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});
  useActionToast(state, { success: t("submitted"), error: t("invalid") });

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="completionId" value={completionId} />

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("rating")} *</span>
        {/* Radio stars, reverse-ordered so CSS peer highlighting fills left→right */}
        <div className="flex flex-row-reverse justify-end gap-1">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="group cursor-pointer">
              <input
                type="radio"
                name="rating"
                value={n}
                defaultChecked={currentRating === n}
                className="peer sr-only"
              />
              <span className="text-2xl text-gray-300 peer-checked:text-amber-500 group-hover:text-amber-400">
                ★
              </span>
            </label>
          ))}
        </div>
        {state.fieldErrors?.rating && (
          <span className="text-red-600">{t("ratingRequired")}</span>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("comment")}</span>
        <textarea
          name="comment"
          rows={3}
          defaultValue={currentComment}
          placeholder={t("commentHint")}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
        />
      </label>

      {state.ok && <p className="text-sm text-emerald-700">{t("submitted")}</p>}
      {state.error === "invalid" && (
        <p className="text-sm text-red-600">{t("invalid")}</p>
      )}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? tc("saving") : t("submit")}
        </Button>
      </div>
    </form>
  );
}
