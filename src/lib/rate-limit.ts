import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Postgres-backed fixed-window rate limiting (brute-force / spam protection).
 *
 * Why Postgres and not an in-memory or Redis store: the app runs as one or more
 * containers behind a load balancer, so an in-process counter would be wrong
 * across instances, and a shared counter in our own India-region database keeps
 * the data resident (DPDP) with no extra infrastructure. The `RateLimit` model
 * is a single (bucket, key) → count row with a window expiry.
 *
 * All functions FAIL OPEN: if the database is unreachable we allow the request
 * rather than lock everyone out — availability matters more than a perfect limit
 * for an NGO platform, and hard failures are logged for investigation.
 *
 * Two usage patterns:
 *   • Abuse endpoints (public forms, lookups) — call `consumeRateLimit` on every
 *     request; each request counts and the (N+1)th within the window is blocked.
 *   • Credential guessing (login) — call `checkRateLimit` first to gate, then
 *     `recordFailure` only when the attempt fails, so successful logins and
 *     honest typos aren't punished the same as an attack.
 */

export type RateLimitOptions = {
  /** Logical surface being protected, e.g. "login", "apply". */
  bucket: string;
  /** Identifier within the bucket, e.g. an IP, an email, or "email|ip". */
  key: string;
  /** Max allowed hits per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
};

export type RateLimitResult = {
  /** True when the request is allowed. */
  ok: boolean;
  /** Hits recorded in the current window (after any increment). */
  count: number;
  /** Seconds until the window resets — use for a Retry-After header/message. */
  retryAfter: number;
};

function retryAfterSeconds(expiresAt: Date): number {
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000));
}

/**
 * Read or advance the counter for (bucket, key) inside a transaction.
 * Starts a fresh window when there is no row or the previous window has expired.
 * Returns the current count and the active window's expiry.
 */
async function touch(
  bucket: string,
  key: string,
  windowSec: number,
  increment: boolean,
): Promise<{ count: number; expiresAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const existing = await tx.rateLimit.findUnique({
      where: { bucket_key: { bucket, key } },
    });

    // No row yet, or the previous window has elapsed → start a new window.
    if (!existing || existing.expiresAt <= now) {
      const expiresAt = new Date(now.getTime() + windowSec * 1000);
      if (!increment) return { count: 0, expiresAt };
      // upsert covers the race where two requests both see an expired window.
      const row = await tx.rateLimit.upsert({
        where: { bucket_key: { bucket, key } },
        create: { bucket, key, count: 1, expiresAt },
        update: { count: 1, expiresAt },
      });
      return { count: row.count, expiresAt: row.expiresAt };
    }

    // Within the current window.
    if (!increment) return { count: existing.count, expiresAt: existing.expiresAt };
    const row = await tx.rateLimit.update({
      where: { bucket_key: { bucket, key } },
      data: { count: { increment: 1 } },
    });
    return { count: row.count, expiresAt: row.expiresAt };
  });
}

/**
 * Read-only gate: is this (bucket, key) already at or over the limit?
 * Does NOT count the current request — pair with {@link recordFailure}.
 */
export async function checkRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const { count, expiresAt } = await touch(
      opts.bucket,
      opts.key,
      opts.windowSec,
      false,
    );
    return {
      ok: count < opts.limit,
      count,
      retryAfter: count < opts.limit ? 0 : retryAfterSeconds(expiresAt),
    };
  } catch (err) {
    console.error("[rate-limit] checkRateLimit failed (allowing):", err);
    return { ok: true, count: 0, retryAfter: 0 };
  }
}

/**
 * Record one failed attempt against (bucket, key). Use after a login failure so
 * only bad attempts accrue toward the limit.
 */
export async function recordFailure(
  opts: Omit<RateLimitOptions, "limit">,
): Promise<void> {
  try {
    await touch(opts.bucket, opts.key, opts.windowSec, true);
  } catch (err) {
    console.error("[rate-limit] recordFailure failed:", err);
  }
}

/**
 * Atomic count-and-gate for abuse endpoints: increments the counter and blocks
 * once the window total exceeds the limit. Every call counts as one hit.
 */
export async function consumeRateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  try {
    const { count, expiresAt } = await touch(
      opts.bucket,
      opts.key,
      opts.windowSec,
      true,
    );
    return {
      ok: count <= opts.limit,
      count,
      retryAfter: count <= opts.limit ? 0 : retryAfterSeconds(expiresAt),
    };
  } catch (err) {
    console.error("[rate-limit] consumeRateLimit failed (allowing):", err);
    return { ok: true, count: 0, retryAfter: 0 };
  }
}

/**
 * Best-effort removal of expired rows. Call opportunistically (the table stays
 * tiny regardless); a scheduled job can be added later if needed.
 */
export async function pruneExpiredRateLimits(): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  } catch (err) {
    console.error("[rate-limit] prune failed:", err);
  }
}
