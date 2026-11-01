// One-shot confirmation messages carried in the URL after a server action
// redirects (e.g. ?flash=saved). Shown by <FlashToast>, which then removes it.
// Plain module so server actions can import it.

export const FLASHES = ["saved", "deleted"] as const;
export type Flash = (typeof FLASHES)[number];

/** Append `flash=<kind>` to a redirect path, preserving any existing query. */
export function withFlash(path: string, flash: Flash): string {
  return `${path}${path.includes("?") ? "&" : "?"}flash=${flash}`;
}
