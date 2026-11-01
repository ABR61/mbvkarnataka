"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";

// Today's arrival/departure card for a trainer. The buttons say "Mark arrival"
// / "Mark departure" (not Login/Logout) so they can't be confused with signing
// out of the app. A recorded step turns into a solid green "done" state with
// the time, rather than a faded disabled button that looks broken.
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

  const done =
    "inline-flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white";

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 sm:p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
      <h2 className="text-lg font-semibold">{t("today")}</h2>
      <div className="mt-2 flex flex-wrap gap-6 text-sm">
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t("checkIn")}</div>
          <div className="text-xl font-bold tabular-nums">{checkIn ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400">{t("checkOut")}</div>
          <div className="text-xl font-bold tabular-nums">{checkOut ?? "—"}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {checkedIn ? (
          <span className={done} role="status">
            ✓ {t("arrivedAt", { time: checkIn ?? "" })}
          </span>
        ) : (
          <form action={inAction}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={inPending}
              className="w-full rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:w-auto"
            >
              {inPending ? t("saving") : t("checkInBtn")}
            </button>
          </form>
        )}

        {checkedOut ? (
          <span className={done} role="status">
            ✓ {t("leftAt", { time: checkOut ?? "" })}
          </span>
        ) : (
          checkedIn && (
            <form action={outAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                disabled={outPending}
                onClick={(e) => {
                  if (!window.confirm(t("confirmDeparture"))) e.preventDefault();
                }}
                className="w-full rounded-md border-2 border-emerald-600 px-5 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 sm:w-auto dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                {outPending ? t("saving") : t("checkOutBtn")}
              </button>
            </form>
          )
        )}
      </div>

      {(inState.error === "alreadyIn" || outState.error) && (
        <p role="alert" className="mt-3 text-sm text-amber-800 dark:text-amber-300">
          {t(`err_${inState.error || outState.error}`)}
        </p>
      )}
    </div>
  );
}
