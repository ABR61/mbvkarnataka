import { describe, expect, it } from "vitest";
import {
  issueTicket,
  msUntilRotation,
  qrToken,
  SLOT_SECONDS,
  TICKET_TTL_SECONDS,
  verifyQrToken,
  verifyTicket,
} from "@/lib/checkin-token";

const SECRET = "test-secret";
const T0 = Date.UTC(2026, 10, 3, 4, 30, 0); // a slot boundary-agnostic instant

describe("QR token", () => {
  it("verifies in the same slot and the next one, then expires", () => {
    const tok = qrToken(SECRET, "s1", T0);
    expect(verifyQrToken(SECRET, "s1", tok, T0)).toBe(true);
    expect(verifyQrToken(SECRET, "s1", tok, T0 + SLOT_SECONDS * 1000)).toBe(true); // previous slot still ok
    expect(verifyQrToken(SECRET, "s1", tok, T0 + 2 * SLOT_SECONDS * 1000)).toBe(false); // too old
  });
  it("is bound to the session and the secret", () => {
    const tok = qrToken(SECRET, "s1", T0);
    expect(verifyQrToken(SECRET, "s2", tok, T0)).toBe(false);
    expect(verifyQrToken("other-secret", "s1", tok, T0)).toBe(false);
    expect(verifyQrToken(SECRET, "s1", "garbage", T0)).toBe(false);
  });
  it("rotates on slot boundaries", () => {
    const ms = msUntilRotation(T0);
    expect(ms).toBeGreaterThan(0);
    expect(ms).toBeLessThanOrEqual(SLOT_SECONDS * 1000);
    expect(qrToken(SECRET, "s1", T0)).not.toBe(qrToken(SECRET, "s1", T0 + ms));
  });
});

describe("check-in ticket", () => {
  it("is valid for the TTL and bound to the session", () => {
    const tk = issueTicket(SECRET, "s1", T0);
    expect(verifyTicket(SECRET, "s1", tk, T0 + 60_000)).toBe(true);
    expect(verifyTicket(SECRET, "s1", tk, T0 + (TICKET_TTL_SECONDS + 1) * 1000)).toBe(false);
    expect(verifyTicket(SECRET, "s2", tk, T0)).toBe(false);
  });
  it("rejects tampering", () => {
    const [issued, sig] = issueTicket(SECRET, "s1", T0).split(".");
    expect(verifyTicket(SECRET, "s1", `${Number(issued) + 100}.${sig}`, T0 + 100_000)).toBe(false);
    expect(verifyTicket(SECRET, "s1", "nonsense", T0)).toBe(false);
    expect(verifyTicket(SECRET, "s1", `${issued}.`, T0)).toBe(false);
  });
});
