import { describe, it, expect } from "vitest";
import { randomCode, certificateSerial } from "@/lib/certificate";

describe("randomCode", () => {
  it("returns a code of the requested length", () => {
    expect(randomCode(6)).toHaveLength(6);
    expect(randomCode(16)).toHaveLength(16);
  });

  it("uses only the unambiguous alphabet (no 0/O/1/I)", () => {
    const code = randomCode(200);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("is effectively unique across calls", () => {
    const codes = new Set(Array.from({ length: 500 }, () => randomCode(12)));
    expect(codes.size).toBe(500);
  });
});

describe("certificateSerial", () => {
  it("formats as MBV-<year>-<code>", () => {
    expect(certificateSerial(2026, "AB12CD")).toBe("MBV-2026-AB12CD");
  });
});
