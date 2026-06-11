// Helpers for the `{ en, kn }` JSON shape used by localized content fields
// (District/Center/Program/Course names, etc.). PURE module.

export type LocalizedText = { en: string; kn?: string };

/** Read the best string for `locale` from a localized JSON value, falling back en → kn. */
export function localized(value: unknown, locale: string): string {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as Record<string, string | undefined>;
    return v[locale] ?? v.en ?? v.kn ?? "";
  }
  return typeof value === "string" ? value : "";
}

/** Build a `{ en, kn }` value, dropping an empty Kannada string. */
export function toLocalized(en: string, kn?: string): LocalizedText {
  const trimmedKn = kn?.trim();
  return trimmedKn ? { en: en.trim(), kn: trimmedKn } : { en: en.trim() };
}
