import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/client-ip";

function h(init: Record<string, string>): Headers {
  return new Headers(init);
}

describe("getClientIp", () => {
  it("takes the first entry of x-forwarded-for", () => {
    expect(getClientIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe(
      "203.0.113.7",
    );
  });

  it("trims whitespace around the forwarded IP", () => {
    expect(getClientIp(h({ "x-forwarded-for": "  198.51.100.9 " }))).toBe(
      "198.51.100.9",
    );
  });

  it("falls back to x-real-ip when no forwarded header", () => {
    expect(getClientIp(h({ "x-real-ip": "192.0.2.44" }))).toBe("192.0.2.44");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      getClientIp(h({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "192.0.2.44" })),
    ).toBe("203.0.113.7");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    expect(getClientIp(h({}))).toBe("unknown");
  });

  it("ignores an empty x-forwarded-for and uses x-real-ip", () => {
    expect(getClientIp(h({ "x-forwarded-for": "", "x-real-ip": "192.0.2.44" }))).toBe(
      "192.0.2.44",
    );
  });
});
