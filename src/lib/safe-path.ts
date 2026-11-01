/**
 * Accept a post-login return path only if it's a path on this site.
 *
 * `startsWith("/")` alone is not enough: "//evil.com" and "/\evil.com" are
 * treated by browsers as links to another site (an open redirect, useful for
 * phishing). Returns the path, or undefined if it isn't safe.
 */
export function safeInternalPath(p: string | null | undefined): string | undefined {
  if (!p || !p.startsWith("/")) return undefined;
  if (p.startsWith("//") || p.startsWith("/\\")) return undefined;
  if (/[\u0000-\u001f\u007f]/.test(p)) return undefined; // control chars (e.g. tab/newline tricks)
  return p;
}
