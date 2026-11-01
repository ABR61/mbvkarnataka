// Signed, short-lived tokens for QR self check-in. Pure functions (secret and
// clock passed in) so they can be unit-tested; see checkinSecret() for the key.
//
// Two stages:
//  1. QR token  — shown on the trainer's screen, rotates every SLOT_SECONDS.
//     Valid for the current and previous slot (so up to ~60 s after display).
//  2. Ticket    — issued when a fresh QR token is opened; lets the trainee
//     finish signing in and confirm within TICKET_TTL_SECONDS. Bound to the
//     session, so it can't be reused for another session.

import { createHmac, timingSafeEqual } from "node:crypto";

export const SLOT_SECONDS = 30;
export const TICKET_TTL_SECONDS = 5 * 60;

const sign = (secret: string, payload: string) =>
  createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 22);

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export const slotAt = (nowMs: number) => Math.floor(nowMs / 1000 / SLOT_SECONDS);

/** The QR token for a session at a given moment. */
export function qrToken(secret: string, sessionId: string, nowMs: number): string {
  return sign(secret, `qr|${sessionId}|${slotAt(nowMs)}`);
}

/** Milliseconds until the current QR token rotates. */
export function msUntilRotation(nowMs: number): number {
  return (slotAt(nowMs) + 1) * SLOT_SECONDS * 1000 - nowMs;
}

/** True if `token` matches the current or previous slot for this session. */
export function verifyQrToken(secret: string, sessionId: string, token: string, nowMs: number): boolean {
  const slot = slotAt(nowMs);
  return [slot, slot - 1].some((s) => safeEqual(token, sign(secret, `qr|${sessionId}|${s}`)));
}

/** A ticket "issuedAt.signature" proving a valid QR was opened at issuedAt. */
export function issueTicket(secret: string, sessionId: string, nowMs: number): string {
  const issuedAt = Math.floor(nowMs / 1000);
  return `${issuedAt}.${sign(secret, `ticket|${sessionId}|${issuedAt}`)}`;
}

export function verifyTicket(secret: string, sessionId: string, ticket: string, nowMs: number): boolean {
  const [issuedRaw, sig] = ticket.split(".");
  const issuedAt = Number(issuedRaw);
  if (!Number.isInteger(issuedAt) || !sig) return false;
  const age = Math.floor(nowMs / 1000) - issuedAt;
  if (age < 0 || age > TICKET_TTL_SECONDS) return false;
  return safeEqual(sig, sign(secret, `ticket|${sessionId}|${issuedAt}`));
}

/** The signing key: derived from AUTH_SECRET so no new secret is needed. */
export function checkinSecret(): string {
  const base = process.env.AUTH_SECRET;
  if (!base) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", base).update("mbv-qr-checkin").digest("base64url");
}

/**
 * For the check-in page: keep a still-valid ticket, or exchange a fresh QR
 * token for a new one. Returns null if neither is valid (expired / forged).
 */
export function resolveTicket(sessionId: string, qr: string | undefined, ticket: string | undefined): string | null {
  if (!sessionId) return null;
  const now = Date.now();
  const secret = checkinSecret();
  if (ticket && verifyTicket(secret, sessionId, ticket, now)) return ticket;
  if (qr && verifyQrToken(secret, sessionId, qr, now)) return issueTicket(secret, sessionId, now);
  return null;
}
