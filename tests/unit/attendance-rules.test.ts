import { describe, expect, it } from "vitest";
import {
  distanceMeters,
  findDoubleBookings,
  isBelowMinimum,
  markingWindow,
  sessionFlags,
  summarizeAttendance,
} from "@/lib/attendance-rules";

const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("markingWindow (India date)", () => {
  const session = day("2026-11-03");
  it("is not open before the session day", () => {
    expect(markingWindow(session, new Date("2026-11-02T10:00:00Z"), 0)).toBe("notYet");
  });
  it("opens at India midnight, even while it's still the previous day in UTC", () => {
    // 19:00 UTC on 2 Nov = 00:30 IST on 3 Nov
    expect(markingWindow(session, new Date("2026-11-02T19:00:00Z"), 0)).toBe("open");
  });
  it("is open all of the session day", () => {
    expect(markingWindow(session, new Date("2026-11-03T18:00:00Z"), 0)).toBe("open"); // 23:30 IST
  });
  it("locks the next India day with no grace", () => {
    expect(markingWindow(session, new Date("2026-11-03T18:31:00Z"), 0)).toBe("locked"); // 00:01 IST, 4 Nov
  });
  it("honours a grace period", () => {
    expect(markingWindow(session, new Date("2026-11-04T10:00:00Z"), 1)).toBe("open");
    expect(markingWindow(session, new Date("2026-11-05T10:00:00Z"), 1)).toBe("locked");
  });
});

describe("distanceMeters", () => {
  it("is ~0 for the same point and roughly right for known distances", () => {
    const blr = { lat: 12.9716, lng: 77.5946 };
    expect(distanceMeters(blr, blr)).toBeLessThan(1);
    // ~1 km north
    const d = distanceMeters(blr, { lat: 12.9806, lng: 77.5946 });
    expect(d).toBeGreaterThan(950);
    expect(d).toBeLessThan(1050);
  });
});

describe("summarizeAttendance", () => {
  it("counts present+late, removes excused from the denominator, treats missing as absent", () => {
    const held = ["s1", "s2", "s3", "s4", "s5"];
    const rows = [
      { sessionId: "s1", status: "PRESENT" },
      { sessionId: "s2", status: "LATE" },
      { sessionId: "s3", status: "EXCUSED" },
      { sessionId: "s4", status: "ABSENT" },
      // s5: no record
      { sessionId: "future", status: "PRESENT" }, // not a held session — ignored
    ];
    expect(summarizeAttendance(held, rows)).toEqual({
      held: 5, attended: 2, excused: 1, absent: 2, pct: 50,
    });
  });
  it("returns null pct when nothing can be measured", () => {
    expect(summarizeAttendance([], []).pct).toBeNull();
    expect(summarizeAttendance(["s1"], [{ sessionId: "s1", status: "EXCUSED" }]).pct).toBeNull();
  });
  it("isBelowMinimum ignores unknown percentages", () => {
    expect(isBelowMinimum(79, 80)).toBe(true);
    expect(isBelowMinimum(80, 80)).toBe(false);
    expect(isBelowMinimum(null, 80)).toBe(false);
  });
});

describe("sessionFlags", () => {
  const base = { photoUrl: "x", markedLat: 12.9, markedDistanceM: 40, centerMapped: true, radiusM: 500 };
  it("is clean when photo and nearby location exist", () => {
    expect(sessionFlags(base)).toEqual([]);
  });
  it("flags missing photo, missing location, distance, and unmapped centers", () => {
    expect(sessionFlags({ ...base, photoUrl: null })).toEqual(["noPhoto"]);
    expect(sessionFlags({ ...base, markedLat: null, markedDistanceM: null })).toEqual(["noLocation"]);
    expect(sessionFlags({ ...base, markedDistanceM: 2000 })).toEqual(["farFromCenter"]);
    expect(sessionFlags({ ...base, centerMapped: false, markedDistanceM: null })).toEqual(["centerNotMapped"]);
  });
});

describe("findDoubleBookings", () => {
  const r = (personId: string, sessionId: string, centerId: string, start: string | null, end: string | null) => ({
    personId, sessionId, date: "2026-11-03", centerId, startTime: start, endTime: end,
  });
  it("flags the same trainee present at two centers on one day", () => {
    const out = findDoubleBookings([r("p1", "a", "c1", null, null), r("p1", "b", "c2", null, null)]);
    expect(out).toHaveLength(1);
  });
  it("flags overlapping times at the same center", () => {
    expect(findDoubleBookings([r("p1", "a", "c1", "09:00", "11:00"), r("p1", "b", "c1", "10:30", "12:00")])).toHaveLength(1);
  });
  it("allows back-to-back sessions at the same center", () => {
    expect(findDoubleBookings([r("p1", "a", "c1", "09:00", "11:00"), r("p1", "b", "c1", "11:00", "13:00")])).toHaveLength(0);
    expect(findDoubleBookings([r("p1", "a", "c1", null, null), r("p1", "b", "c1", null, null)])).toHaveLength(0);
  });
});
