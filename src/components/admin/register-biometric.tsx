"use client";

import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { useTranslations } from "next-intl";

/** Admin-triggered enrolment of a staff member's device fingerprint / Face ID. */
export function RegisterBiometric({ personId }: { personId: string }) {
  const t = useTranslations("Staff");
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function register() {
    setBusy(true);
    setMsg("");
    setOk(false);
    try {
      const optRes = await fetch("/api/staff/webauthn/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId }),
      });
      const options = await optRes.json();
      if (!optRes.ok) throw new Error(options.error || "options failed");

      const attResp = await startRegistration(options);

      const verRes = await fetch("/api/staff/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      });
      const ver = await verRes.json();
      if (!verRes.ok || !ver.verified) throw new Error(ver.error || "verify failed");
      setOk(true);
      setMsg(t("biometricRegistered"));
    } catch (e) {
      setMsg((e as Error).message || "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={register}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {busy ? t("scanning") : t("registerBiometric")}
      </button>
      {msg && (
        <span className={`text-sm ${ok ? "text-emerald-700" : "text-red-600"}`}>
          {msg}
        </span>
      )}
    </div>
  );
}
