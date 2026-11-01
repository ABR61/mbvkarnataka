"use client";

import { useEffect, useState } from "react";
import { browserSupportsWebAuthn, startAuthentication } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";

type ClockError = "unsupported" | "cancelled" | "notRegistered" | "rateLimited" | "network" | "failed";

class ClockFailure extends Error {
  constructor(public code: ClockError) {
    super(code);
  }
}

// How long a result stays on screen at a shared kiosk before clearing, so the
// next person doesn't see the previous person's name.
const CLEAR_AFTER_MS = 10_000;

/** Kiosk clock-in/out: staff scan their registered fingerprint / Face ID. */
export function ClockWidget() {
  const t = useTranslations("Clock");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ClockError | null>(null);
  const [result, setResult] = useState<
    | { name: string; action: "in" | "out"; time: string }
    | null
  >(null);

  // Auto-clear the result/error after a short while.
  useEffect(() => {
    if (!result && !error) return;
    const timer = setTimeout(() => {
      setResult(null);
      setError(null);
    }, CLEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, [result, error]);

  async function clock() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (!browserSupportsWebAuthn()) throw new ClockFailure("unsupported");

      const optRes = await fetch("/api/staff/webauthn/clock/options", { method: "POST" });
      if (optRes.status === 429) throw new ClockFailure("rateLimited");
      const options = await optRes.json();
      if (!optRes.ok) throw new ClockFailure("failed");

      let asseResp;
      try {
        asseResp = await startAuthentication(options);
      } catch (e) {
        // NotAllowedError = the person cancelled the prompt or it timed out.
        throw new ClockFailure((e as Error).name === "NotAllowedError" ? "cancelled" : "failed");
      }

      const verRes = await fetch("/api/staff/webauthn/clock/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(asseResp),
      });
      if (verRes.status === 404) throw new ClockFailure("notRegistered");
      if (verRes.status === 429) throw new ClockFailure("rateLimited");
      const ver = await verRes.json();
      if (!verRes.ok || !ver.verified) throw new ClockFailure("failed");
      setResult({ name: ver.name, action: ver.action, time: ver.time });
    } catch (e) {
      // fetch() rejects with a TypeError when there's no connection.
      setError(e instanceof ClockFailure ? e.code : e instanceof TypeError ? "network" : "failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{t("subtitle")}</p>
      </div>

      <button
        type="button"
        onClick={clock}
        disabled={busy}
        className="flex h-40 w-40 flex-col items-center justify-center gap-2 rounded-full bg-emerald-600 text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60"
      >
        <svg aria-hidden className="h-14 w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" d="M12 11a2 2 0 0 0-2 2v3m2-11a7 7 0 0 1 7 7v2m-14-2a7 7 0 0 1 3-5.7M8 20.5A9 9 0 0 1 5 14m11 6.5c.6-1 1-2.2 1-3.5m-9 4a13 13 0 0 0 1-5 3 3 0 0 1 6 0" />
        </svg>
        <span className="text-sm font-semibold">
          {busy ? t("scanning") : t("clockButton")}
        </span>
      </button>

      <div aria-live="polite" className="w-full">
        {result && (
          <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900 dark:bg-emerald-950">
            <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
              {t("welcome", { name: result.name })}
            </p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-300">
              {result.action === "in" ? t("clockedIn") : t("clockedOut")} · {result.time}
            </p>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="w-full rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          >
            {t(`error_${error}`)}
          </div>
        )}
      </div>

      <p className="text-center text-sm text-gray-600 dark:text-gray-400">{t("firstTime")}</p>
    </div>
  );
}
