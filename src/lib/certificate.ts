import { randomBytes } from "node:crypto";

// Crockford-ish alphabet: no 0/O/1/I to keep printed serials unambiguous.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random code of `length` chars from an unambiguous alphabet. */
export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Human-readable certificate serial, e.g. MBV-2026-AB12CD. */
export function certificateSerial(year: number, code: string): string {
  return `MBV-${year}-${code}`;
}
