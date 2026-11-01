import { describe, expect, it } from "vitest";
import { formatDate, formatDateWithWeekday, nowHHMM, todayISO } from "@/lib/dates";

describe("dates (pinned to Asia/Kolkata)", () => {
  it("formats a stored date-only value (UTC midnight) on the same day", () => {
    expect(formatDate(new Date("2026-11-03T00:00:00Z"), "en")).toBe("3 Nov 2026");
  });

  it("uses India time, not UTC, for timestamps late in the UTC day", () => {
    // 20:00 UTC on 2 Nov = 01:30 IST on 3 Nov.
    expect(formatDate(new Date("2026-11-02T20:00:00Z"), "en")).toBe("3 Nov 2026");
  });

  it("renders Kannada month names for kn", () => {
    const kn = formatDate(new Date("2026-11-03T00:00:00Z"), "kn");
    expect(kn).not.toBe("3 Nov 2026");
    expect(kn).toMatch(/2026/);
  });

  it("adds a weekday for schedules", () => {
    expect(formatDateWithWeekday(new Date("2026-11-03T00:00:00Z"), "en")).toMatch(/^Tue/);
  });

  it("returns a dash for missing or invalid dates", () => {
    expect(formatDate(null, "en")).toBe("—");
    expect(formatDate("not a date", "en")).toBe("—");
  });

  it("computes today's date and time in India regardless of server zone", () => {
    const at = new Date("2026-11-02T20:00:00Z"); // 01:30 IST, 3 Nov
    expect(todayISO(at)).toBe("2026-11-03");
    expect(nowHHMM(at)).toBe("01:30");
    expect(nowHHMM(new Date("2026-11-03T04:00:00Z"))).toBe("09:30");
  });
});
