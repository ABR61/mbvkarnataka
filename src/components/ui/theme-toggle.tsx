"use client";

import { useTranslations } from "next-intl";

// Toggles the explicit light/dark override and persists it. The pre-paint script
// in the locale layout applies the stored choice on load; this just flips the
// `data-theme` attribute. No React state is needed — the two icons are both
// rendered and CSS (`dark:` variant, driven by data-theme) shows the right one,
// which keeps it hydration-safe and avoids setState-in-effect.
export function ThemeToggle() {
  const t = useTranslations("Common");

  function toggle() {
    const el = document.documentElement;
    const next = el.getAttribute("data-theme") === "dark" ? "light" : "dark";
    el.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // storage unavailable (private mode) — the choice just won't persist
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
    >
      {/* Moon — shown in light mode (click to go dark) */}
      <svg
        aria-hidden
        className="h-5 w-5 dark:hidden"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
      {/* Sun — shown in dark mode (click to go light) */}
      <svg
        aria-hidden
        className="hidden h-5 w-5 dark:block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="4" />
        <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41" />
      </svg>
    </button>
  );
}
