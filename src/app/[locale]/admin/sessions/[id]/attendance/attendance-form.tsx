"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ATTENDANCE_STATUSES } from "@/lib/validation/session";
import type { FormState } from "@/lib/forms";
import { ImagePicker } from "@/components/image-picker";
import { CheckinQr } from "./checkin-qr";

type RosterRow = { personId: string; name: string; status: string | null; checkedInAt: string | null };
type Geo =
  | { state: "requesting" }
  | { state: "ok"; lat: number; lng: number; accuracy: number }
  | { state: "denied" | "unavailable" };

// Marking form, shown only while the session's marking window is open.
// Captures evidence alongside the roster: a class photo and the phone's
// location (both are stored with the session; missing evidence is flagged for
// review rather than blocking the save, so a weak signal never stops marking).
export function AttendanceForm({
  locale,
  sessionId,
  roster,
  existingPhoto,
  action,
}: {
  locale: string;
  sessionId: string;
  roster: RosterRow[];
  existingPhoto: string | null;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Attendance");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});
  const [photo, setPhoto] = useState(existingPhoto ?? "");
  const [geo, setGeo] = useState<Geo>({ state: "requesting" });
  const [attempt, setAttempt] = useState(0);
  const [showQr, setShowQr] = useState(false);
  const [checkedIn, setCheckedIn] = useState<Set<string>>(
    () => new Set(roster.filter((r) => r.checkedInAt).map((r) => r.personId)),
  );
  const formRef = useRef<HTMLFormElement>(null);

  // When trainees check themselves in, pre-select "Present" for them unless the
  // trainer has already chosen something.
  const onCheckins = useCallback((ids: string[]) => {
    setCheckedIn(new Set(ids));
    for (const id of ids) {
      const sel = formRef.current?.querySelector<HTMLSelectElement>(`select[name="status_${id}"]`);
      if (sel && !sel.value) sel.value = "PRESENT";
    }
  }, []);

  // Ask for the phone's location when the form opens (and on "Try again").
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      queueMicrotask(() => setGeo({ state: "unavailable" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setGeo({
          state: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => setGeo({ state: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }, [attempt]);

  const td = "px-3 py-2 border-t border-gray-100 dark:border-gray-800";

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="photoUrl" value={photo} />
      {geo.state === "ok" && (
        <>
          <input type="hidden" name="lat" value={geo.lat} />
          <input type="hidden" name="lng" value={geo.lng} />
          <input type="hidden" name="accuracy" value={geo.accuracy} />
        </>
      )}

      {/* Evidence */}
      <div className="grid gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-2 dark:border-gray-800">
        <div className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{t("classPhoto")}</span>
          <span className="text-xs text-gray-600 dark:text-gray-400">{t("classPhotoHint")}</span>
          <div className="mt-1">
            <ImagePicker kind="session" value={photo} onChange={setPhoto} />
          </div>
        </div>
        <div className="flex flex-col gap-1 text-sm" aria-live="polite">
          <span className="font-medium">{t("location")}</span>
          {geo.state === "requesting" && <span className="text-gray-600 dark:text-gray-400">{t("locating")}</span>}
          {geo.state === "ok" && (
            <span className="text-emerald-700 dark:text-emerald-400">
              ✓ {t("locationCaptured", { accuracy: Math.round(geo.accuracy) })}
            </span>
          )}
          {(geo.state === "denied" || geo.state === "unavailable") && (
            <span className="text-amber-800 dark:text-amber-300">
              {t(geo.state === "denied" ? "locationDenied" : "locationUnavailable")}{" "}
              <button
                type="button"
                onClick={() => {
                  setGeo({ state: "requesting" });
                  setAttempt((n) => n + 1);
                }}
                className="font-medium underline"
              >
                {t("tryAgain")}
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Trainee self check-in by QR */}
      <div className="flex flex-col gap-3">
        <div>
          <button
            type="button"
            onClick={() => setShowQr((v) => !v)}
            aria-expanded={showQr}
            className="rounded-md border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            {showQr ? t("hideQr") : t("showQr")}
          </button>
          {!showQr && <span className="ml-3 text-xs text-gray-600 dark:text-gray-400">{t("qrHint")}</span>}
        </div>
        {showQr && <CheckinQr locale={locale} sessionId={sessionId} onCheckins={onCheckins} />}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget
              .closest("form")
              ?.querySelectorAll<HTMLSelectElement>("select[data-att]")
              .forEach((s) => {
                s.value = "PRESENT";
              });
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("allPresent")}
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-400">{t("markEveryone")}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full max-w-xl text-sm">
          <tbody>
            {roster.map((r) => (
              <tr key={r.personId}>
                <td className={td}>
                  {r.name}
                  {checkedIn.has(r.personId) && (
                    <span className="ml-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">✓ {t("selfCheckedIn")}</span>
                  )}
                </td>
                <td className={`${td} w-44`}>
                  <select
                    name={`status_${r.personId}`}
                    data-att
                    required
                    defaultValue={r.status ?? ""}
                    aria-label={t("statusFor", { name: r.name })}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <option value="" disabled>
                      {t("choose")}
                    </option>
                    {ATTENDANCE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {t(`status_${s}`)}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state.error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {t(`err_${state.error}`)}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : t("saveAttendance")}
        </button>
        <Link href="/admin/sessions" className="text-sm text-gray-600 hover:underline dark:text-gray-400">
          {tc("cancel")}
        </Link>
      </div>
    </form>
  );
}
