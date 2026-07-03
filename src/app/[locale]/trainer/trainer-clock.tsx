"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";

export function TrainerClock({
  locale,
  checkIn,
  checkOut,
  checkedIn,
  checkedOut,
  checkInAction,
  checkOutAction,
}: {
  locale: string;
  checkIn: string | null;
  checkOut: string | null;
  checkedIn: boolean;
  checkedOut: boolean;
  checkInAction: (prev: FormState, formData: FormData) => Promise<FormState>;
  checkOutAction: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("TrainerHome");
  const [inState, inAction, inPending] = useActionState(checkInAction, {});
  const [outState, outAction, outPending] = useActionState(checkOutAction, {});

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <h2 className="text-lg font-semibold">{t("today")}</h2>
      <div className="mt-2 flex flex-wrap gap-6 text-sm">
        <div>
          <div className="text-xs text-gray-500">{t("checkIn")}</div>
          <div className="text-xl font-bold tabular-nums">{checkIn ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">{t("checkOut")}</div>
          <div className="text-xl font-bold tabular-nums">{checkOut ?? "—"}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <form action={inAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            disabled={inPending || checkedIn}
            className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {checkedIn ? t("checkedIn") : inPending ? t("saving") : t("checkInBtn")}
          </button>
        </form>
        <form action={outAction}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            disabled={outPending || !checkedIn || checkedOut}
            className="rounded-md border border-emerald-600 px-5 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-950/40"
          >
            {checkedOut ? t("checkedOut") : outPending ? t("saving") : t("checkOutBtn")}
          </button>
        </form>
      </div>

      {(inState.error === "alreadyIn" || outState.error) && (
        <p className="mt-3 text-sm text-amber-700">
          {t(`err_${inState.error || outState.error}`)}
        </p>
      )}
    </div>
  );
}
