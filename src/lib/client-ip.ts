/**
 * Best-effort client IP from request headers.
 *
 * Behind AWS ALB / a CDN the real client is the first entry of
 * `x-forwarded-for`; `x-real-ip` is a fallback. NOTE: these headers are
 * client-settable unless a trusted proxy overwrites them, so an IP alone is a
 * weak identity — for login we combine it with the email so spoofing one IP
 * cannot unlock unlimited guesses against an account. Ensure the load balancer
 * is configured to append/replace `x-forwarded-for` in production.
 *
 * Returns "unknown" rather than null so callers always have a usable key.
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
