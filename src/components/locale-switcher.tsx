"use client";

import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { en: "EN", kn: "ಕನ್ನಡ" };

export function LocaleSwitcher() {
  const pathname = usePathname(); // locale-stripped path from next-intl
  const router = useRouter();
  const params = useParams();
  const current = params.locale as string;

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => router.replace(pathname, { locale: loc })}
          disabled={loc === current}
          className="rounded px-2 py-1 text-xs hover:bg-gray-100 disabled:font-semibold disabled:text-emerald-700 dark:hover:bg-gray-800"
        >
          {LABELS[loc] ?? loc}
        </button>
      ))}
    </div>
  );
}
