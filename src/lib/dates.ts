// Date/time helpers for display and "today" logic. Pure module (no server-only
// imports) so both server and client components can use it.
//
// Everything is pinned to India time. Servers usually run in UTC, so relying on
// the machine's local time would record a 09:30 check-in as 04:00 and treat the
// hours 00:00–05:30 IST as "yesterday".
//
// Date-only values are stored as UTC midnight (see parseDate); formatted in IST
// they land on the same calendar day (05:30), so one helper serves both.

export const APP_TIME_ZONE = "Asia/Kolkata";

type DateInput = Date | string | number | null | undefined;

function toDate(d: DateInput): Date | null {
  if (d == null || d === "") return null;
  const date = d instanceof Date ? d : new Date(d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** BCP-47 locale for our app locales ("en" | "kn"), with Indian conventions. */
export function intlLocale(locale: string): string {
  return locale === "kn" ? "kn-IN" : "en-IN";
}

/** A friendly date, e.g. "3 Nov 2026" (or Kannada month names for "kn"). */
export function formatDate(
  d: DateInput,
  locale: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const date = toDate(d);
  if (!date) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    ...options,
  }).format(date);
}

/** Date with weekday, e.g. "Tue, 3 Nov 2026" — for schedules. */
export function formatDateWithWeekday(d: DateInput, locale: string): string {
  return formatDate(d, locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Date and time, e.g. "3 Nov 2026, 9:30 am". */
export function formatDateTime(d: DateInput, locale: string): string {
  return formatDate(d, locale, { dateStyle: "medium", timeStyle: "short" });
}

/** Today's date in India as "YYYY-MM-DD" (for comparisons and form defaults). */
export function todayISO(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Current time in India as 24-hour "HH:MM". */
export function nowHHMM(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
}
