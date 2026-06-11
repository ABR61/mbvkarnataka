import { describe, it, expect } from "vitest";
import { localized, toLocalized, toLocalizedOrNull } from "@/lib/localized";

describe("localized", () => {
  it("returns the requested locale", () => {
    expect(localized({ en: "Hello", kn: "ನಮಸ್ಕಾರ" }, "kn")).toBe("ನಮಸ್ಕಾರ");
  });

  it("falls back en → kn → empty", () => {
    expect(localized({ en: "Hello" }, "kn")).toBe("Hello");
    expect(localized({ kn: "ನಮಸ್ಕಾರ" }, "en")).toBe("ನಮಸ್ಕಾರ");
    expect(localized({}, "en")).toBe("");
  });

  it("handles plain strings and non-objects", () => {
    expect(localized("plain", "en")).toBe("plain");
    expect(localized(null, "en")).toBe("");
    expect(localized(42, "en")).toBe("");
  });
});

describe("toLocalized", () => {
  it("drops empty Kannada", () => {
    expect(toLocalized("Hello", "")).toEqual({ en: "Hello" });
    expect(toLocalized("Hello", "  ")).toEqual({ en: "Hello" });
  });

  it("keeps and trims both when present", () => {
    expect(toLocalized(" Hello ", " ನಮಸ್ಕಾರ ")).toEqual({
      en: "Hello",
      kn: "ನಮಸ್ಕಾರ",
    });
  });
});

describe("toLocalizedOrNull", () => {
  it("returns null when both empty", () => {
    expect(toLocalizedOrNull("", "")).toBeNull();
    expect(toLocalizedOrNull("  ", "")).toBeNull();
  });

  it("returns a value when either is present", () => {
    expect(toLocalizedOrNull("Hi", "")).toEqual({ en: "Hi" });
    expect(toLocalizedOrNull("", "ನಮಸ್ಕಾರ")).toEqual({ en: "", kn: "ನಮಸ್ಕಾರ" });
  });
});
