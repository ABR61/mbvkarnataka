import "server-only";
import { NextResponse } from "next/server";
import { consumeRateLimit, type RateLimitOptions } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

/**
 * Rate-limit gate for API route handlers. Returns a 429 `NextResponse` (with a
 * `Retry-After` header) when the limit is exceeded, or `null` to proceed:
 *
 *   const limited = await rateLimitApiRoute(req, { bucket, limit, windowSec });
 *   if (limited) return limited;
 *
 * Keyed by client IP unless an explicit `key` is given.
 */
export async function rateLimitApiRoute(
  req: Request,
  opts: Omit<RateLimitOptions, "key"> & { key?: string },
): Promise<NextResponse | null> {
  const key = opts.key ?? getClientIp(req.headers);
  const gate = await consumeRateLimit({
    bucket: opts.bucket,
    key,
    limit: opts.limit,
    windowSec: opts.windowSec,
  });
  if (gate.ok) return null;
  return NextResponse.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(gate.retryAfter) } },
  );
}
