"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";

// Latitude/longitude inputs for a center, with "Use my current location" so a
// coordinator standing at the center can fill them in one tap. Attendance
// marking is checked against this point.
export function CenterLocationFields({
  latitude,
  longitude,
  fieldClass,
}: {
  latitude?: number | null;
  longitude?: number | null;
  fieldClass: string;
}) {
  const t = useTranslations("Centers");
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "busy" | "ok" | "failed">("idle");

  function useMyLocation() {
    if (!navigator.geolocation) return setStatus("failed");
    setStatus("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) latRef.current.value = pos.coords.latitude.toFixed(6);
        if (lngRef.current) lngRef.current.value = pos.coords.longitude.toFixed(6);
        setStatus("ok");
      },
      () => setStatus("failed"),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="font-medium">{t("location")}</legend>
      <span className="text-xs text-gray-600 dark:text-gray-400">{t("locationHint")}</span>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span>{t("latitude")}</span>
          <input ref={latRef} name="latitude" inputMode="decimal" defaultValue={latitude ?? ""} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span>{t("longitude")}</span>
          <input ref={lngRef} name="longitude" inputMode="decimal" defaultValue={longitude ?? ""} className={fieldClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3" aria-live="polite">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={status === "busy"}
          className="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {status === "busy" ? t("locating") : t("useMyLocation")}
        </button>
        {status === "ok" && <span className="text-emerald-700 dark:text-emerald-400">✓ {t("locationFilled")}</span>}
        {status === "failed" && <span className="text-amber-800 dark:text-amber-300">{t("locationFailed")}</span>}
      </div>
    </fieldset>
  );
}
