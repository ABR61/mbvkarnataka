import { describe, it, expect } from "vitest";
import { cohortInput, parseDate } from "@/lib/validation/cohort";
import {
  sessionInput,
  isAttendanceStatus,
  ATTENDANCE_STATUSES,
} from "@/lib/validation/session";

describe("parseDate", () => {
  it("parses YYYY-MM-DD to a Date", () => {
    const d = parseDate("2026-07-01");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-01");
  });

  it("returns null for empty/invalid", () => {
    expect(parseDate("")).toBeNull();
    expect(parseDate("garbage")).toBeNull();
  });
});

describe("cohortInput", () => {
  it("requires program, center and a valid status", () => {
    expect(
      cohortInput.safeParse({
        programId: "p1",
        centerId: "c1",
        status: "ACTIVE",
      }).success,
    ).toBe(true);

    expect(
      cohortInput.safeParse({ programId: "", centerId: "c1", status: "ACTIVE" })
        .success,
    ).toBe(false);

    expect(
      cohortInput.safeParse({
        programId: "p1",
        centerId: "c1",
        status: "BOGUS",
      }).success,
    ).toBe(false);
  });

  it("coerces an empty capacity to null", () => {
    const r = cohortInput.safeParse({
      programId: "p1",
      centerId: "c1",
      status: "PLANNED",
      capacity: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.capacity).toBeNull();
  });
});

describe("sessionInput", () => {
  it("requires cohort, course and date", () => {
    expect(
      sessionInput.safeParse({
        cohortId: "co1",
        courseId: "cr1",
        sessionDate: "2026-07-05",
        status: "SCHEDULED",
      }).success,
    ).toBe(true);

    expect(
      sessionInput.safeParse({
        cohortId: "",
        courseId: "cr1",
        sessionDate: "2026-07-05",
        status: "SCHEDULED",
      }).success,
    ).toBe(false);
  });

  it("rejects a malformed time", () => {
    const r = sessionInput.safeParse({
      cohortId: "co1",
      courseId: "cr1",
      sessionDate: "2026-07-05",
      startTime: "25:99:99",
      status: "SCHEDULED",
    });
    expect(r.success).toBe(false);
  });
});

describe("isAttendanceStatus", () => {
  it("accepts the four valid statuses", () => {
    for (const s of ATTENDANCE_STATUSES) expect(isAttendanceStatus(s)).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isAttendanceStatus("MAYBE")).toBe(false);
    expect(isAttendanceStatus("")).toBe(false);
    expect(isAttendanceStatus(undefined)).toBe(false);
  });
});
