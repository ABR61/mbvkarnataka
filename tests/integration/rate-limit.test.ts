import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  consumeRateLimit,
  pruneExpiredRateLimits,
  recordFailure,
} from "@/lib/rate-limit";

async function clear() {
  await prisma.rateLimit.deleteMany({});
}

beforeEach(clear);
afterAll(async () => {
  await clear();
  await prisma.$disconnect();
});

describe("consumeRateLimit", () => {
  it("allows up to the limit then blocks, with a retryAfter", async () => {
    const opts = { bucket: "test", key: "ip-1", limit: 3, windowSec: 60 };

    for (let n = 1; n <= 3; n++) {
      const r = await consumeRateLimit(opts);
      expect(r.ok).toBe(true);
      expect(r.count).toBe(n);
    }

    const blocked = await consumeRateLimit(opts);
    expect(blocked.ok).toBe(false);
    expect(blocked.count).toBe(4);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(60);
  });

  it("keeps separate counters per key", async () => {
    const base = { bucket: "test", limit: 1, windowSec: 60 };
    expect((await consumeRateLimit({ ...base, key: "a" })).ok).toBe(true);
    expect((await consumeRateLimit({ ...base, key: "a" })).ok).toBe(false);
    // A different key is unaffected.
    expect((await consumeRateLimit({ ...base, key: "b" })).ok).toBe(true);
  });

  it("starts a fresh window once the previous one has expired", async () => {
    const opts = { bucket: "test", key: "ip-exp", limit: 1, windowSec: 60 };
    expect((await consumeRateLimit(opts)).ok).toBe(true);
    expect((await consumeRateLimit(opts)).ok).toBe(false);

    // Force the window to have already elapsed.
    await prisma.rateLimit.update({
      where: { bucket_key: { bucket: "test", key: "ip-exp" } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const fresh = await consumeRateLimit(opts);
    expect(fresh.ok).toBe(true);
    expect(fresh.count).toBe(1);
  });
});

describe("checkRateLimit + recordFailure (login pattern)", () => {
  it("does not count until a failure is recorded", async () => {
    const key = "user@example.com|ip-9";
    const gate = { bucket: "login", key, limit: 2, windowSec: 60 };

    // Checking alone never accrues.
    for (let n = 0; n < 5; n++) {
      expect((await checkRateLimit(gate)).ok).toBe(true);
    }

    // Two failures reach the limit; the gate then blocks.
    await recordFailure({ bucket: "login", key, windowSec: 60 });
    expect((await checkRateLimit(gate)).ok).toBe(true);
    await recordFailure({ bucket: "login", key, windowSec: 60 });

    const blocked = await checkRateLimit(gate);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});

describe("pruneExpiredRateLimits", () => {
  it("removes only expired rows", async () => {
    await consumeRateLimit({ bucket: "t", key: "live", limit: 5, windowSec: 60 });
    await consumeRateLimit({ bucket: "t", key: "dead", limit: 5, windowSec: 60 });
    await prisma.rateLimit.update({
      where: { bucket_key: { bucket: "t", key: "dead" } },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await pruneExpiredRateLimits();

    const rows = await prisma.rateLimit.findMany();
    expect(rows.map((r) => r.key)).toEqual(["live"]);
  });
});
