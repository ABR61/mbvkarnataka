"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { FormState } from "@/lib/forms";

type Geo = { lat: number; lng: number; accuracy: number } | null;

// "Check me in" for a trainee. Sends the phone's location along with the
// check-in (it's compared with the center's; far-away check-ins are flagged).
export function CheckinConfirm({
  locale,
  sessionId,
  ticket,
  action,
}: {
  locale: string;
  sessionId: string;
  ticket: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Checkin");
  const [state, formAction, pending] = useActionState(action, {});
  const [geo, setGeo] = useState<Geo>(null);
  const [geoDone, setGeoDone] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      queueMicrotask(() => setGeoDone(true));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setGeoDone(true);
      },
      () => setGeoDone(true),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }, []);

  if (state.ok) {
    return (
      <div role="status" className="rounded-xl bg-emerald-600 p-6 text-center text-white">
        <div className="text-4xl" aria-hidden>
          ✓
        </div>
        <p className="mt-2 text-lg font-semibold">{t("done")}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="ticket" value={ticket} />
      {geo && (
        <>
          <input type="hidden" name="lat" value={geo.lat} />
          <input type="hidden" name="lng" value={geo.lng} />
          <input type="hidden" name="accuracy" value={geo.accuracy} />
        </>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? t("checkingIn") : t("checkMeIn")}
      </button>
      <p className="text-center text-xs text-gray-600 dark:text-gray-400" aria-live="polite">
        {!geoDone ? t("locating") : geo ? t("locationOk") : t("locationMissing")}
      </p>
      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {t(`err_${state.error}`)}
        </p>
      )}
    </form>
  );
}
