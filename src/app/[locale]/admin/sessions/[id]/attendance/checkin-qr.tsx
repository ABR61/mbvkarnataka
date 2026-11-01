"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import QRCode from "qrcode";

type Checkin = { personId: string; name: string; at: string; distanceM: number | null };

// Rotating QR for trainee self check-in, shown on the trainer's screen during
// the session. Polls the server for a fresh token (it changes every 30 s, so a
// photo of it soon stops working) and for the list of who has checked in.
export function CheckinQr({
  locale,
  sessionId,
  onCheckins,
}: {
  locale: string;
  sessionId: string;
  onCheckins: (personIds: string[]) => void;
}) {
  const t = useTranslations("Attendance");
  const [svg, setSvg] = useState("");
  const [rotatesAt, setRotatesAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    async function poll() {
      try {
        const res = await fetch(`/api/attendance/qr?session=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const data = await res.json();
        if (stopped) return;
        if (!res.ok) {
          setError(data.error === "closed" ? t("qrClosed") : t("qrError"));
          return;
        }
        setError(null);
        const url = `${window.location.origin}/${locale}/checkin?s=${encodeURIComponent(sessionId)}&t=${encodeURIComponent(data.token)}`;
        setSvg(await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }));
        setRotatesAt(Date.now() + data.rotatesInMs);
        setCheckins(data.checkins);
        onCheckins(data.checkins.map((c: Checkin) => c.personId));
      } catch {
        if (!stopped) setError(t("qrOffline"));
      }
    }
    poll();
    const id = setInterval(poll, 10_000);
    const tick = setInterval(() => setNow(Date.now()), 1_000);
    return () => {
      stopped = true;
      clearInterval(id);
      clearInterval(tick);
    };
  }, [locale, sessionId, onCheckins, t]);

  const secondsLeft = Math.max(0, Math.ceil((rotatesAt - now) / 1000));
  const time = (iso: string) =>
    new Intl.DateTimeFormat(locale === "kn" ? "kn-IN" : "en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div className="grid gap-4 rounded-lg border-2 border-emerald-500 p-4 sm:grid-cols-[auto,1fr]">
      <div className="flex flex-col items-center gap-2">
        {svg ? (
          <div
            className="h-60 w-60 rounded-md bg-white p-2"
            role="img"
            aria-label={t("qrAlt")}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <div className="flex h-60 w-60 items-center justify-center rounded-md bg-gray-100 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            {error ?? t("qrLoading")}
          </div>
        )}
        {svg && !error && <span className="text-xs text-gray-600 dark:text-gray-400">{t("qrRotates", { s: secondsLeft })}</span>}
        {error && svg && <span className="text-xs text-red-700 dark:text-red-400">{error}</span>}
      </div>
      <div className="text-sm">
        <p className="font-medium">{t("qrInstructions")}</p>
        <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          {t("checkedIn", { n: checkins.length })}
        </h3>
        <ul className="mt-1 flex flex-col gap-1" aria-live="polite">
          {checkins.map((c) => (
            <li key={c.personId} className="flex flex-wrap items-center gap-2">
              <span className="text-emerald-700 dark:text-emerald-400" aria-hidden>
                ✓
              </span>
              <span>{c.name}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{time(c.at)}</span>
              {c.distanceM == null && <span className="text-xs text-amber-800 dark:text-amber-300">· {t("noLocationShort")}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
