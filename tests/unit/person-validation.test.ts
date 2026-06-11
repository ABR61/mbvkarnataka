import { describe, it, expect } from "vitest";
import {
  traineeInput,
  trainerCreateInput,
  parseDateOfBirth,
} from "@/lib/validation/person";

describe("parseDateOfBirth", () => {
  it("returns null date for empty input (no error)", () => {
    expect(parseDateOfBirth("")).toEqual({ date: null });
  });

  it("flags invalid dates", () => {
    expect(parseDateOfBirth("not-a-date").error).toBe("invalid");
  });

  it("accepts an adult (>18)", () => {
    const r = parseDateOfBirth("2000-01-01");
    expect(r.error).toBeUndefined();
    expect(r.date).toBeInstanceOf(Date);
  });

  it("rejects an under-18 birth date", () => {
    const recent = new Date();
    const dob = `${recent.getUTCFullYear() - 5}-01-01`;
    expect(parseDateOfBirth(dob).error).toBe("under18");
  });
});

describe("traineeInput", () => {
  it("requires firstName", () => {
    const r = traineeInput.safeParse({ firstName: "" });
    expect(r.success).toBe(false);
  });

  it("accepts a minimal valid trainee with optional email blank", () => {
    const r = traineeInput.safeParse({ firstName: "Asha", email: "" });
    expect(r.success).toBe(true);
  });

  it("rejects a malformed email", () => {
    const r = traineeInput.safeParse({ firstName: "Asha", email: "nope" });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown gender value", () => {
    const r = traineeInput.safeParse({ firstName: "Asha", gender: "ALIEN" });
    expect(r.success).toBe(false);
  });
});

describe("trainerCreateInput", () => {
  it("requires a valid email and an 8+ char password", () => {
    expect(
      trainerCreateInput.safeParse({
        firstName: "Ravi",
        email: "ravi@mbv.local",
        password: "longenough1",
      }).success,
    ).toBe(true);

    expect(
      trainerCreateInput.safeParse({
        firstName: "Ravi",
        email: "ravi@mbv.local",
        password: "short",
      }).success,
    ).toBe(false);

    expect(
      trainerCreateInput.safeParse({
        firstName: "Ravi",
        email: "",
        password: "longenough1",
      }).success,
    ).toBe(false);
  });
});
