"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";

// Client form: takes a certificate code and routes to /verify/[code].
export function VerifyForm({
  codeLabel,
  placeholder,
  buttonLabel,
}: {
  codeLabel: string;
  placeholder: string;
  buttonLabel: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) router.push(`/verify/${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor="verify-code" className="sr-only">
        {codeLabel}
      </label>
      <input
        id="verify-code"
        name="code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="rounded-md border border-gray-300 px-4 py-2.5 text-center focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 dark:border-gray-700 dark:bg-gray-900"
      />
      <button
        type="submit"
        disabled={!code.trim()}
        className="rounded-md bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </form>
  );
}
