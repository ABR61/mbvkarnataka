import { describe, it, expect } from "vitest";
import {
  applicationInput,
  APPLICATION_STATUSES,
} from "@/lib/validation/application";

// A valid Aadhaar is now required on every application, so include one in the
// base fixture and vary the field under test.
const base = { firstName: "Asha", phone: "9876500000", aadhaarNumber: "123456789012" };

describe("applicationInput", () => {
  it("requires firstName and phone", () => {
    expect(applicationInput.safeParse(base).success).toBe(true);

    expect(
      applicationInput.safeParse({ ...base, firstName: "" }).success,
    ).toBe(false);

    expect(applicationInput.safeParse({ ...base, phone: "" }).success).toBe(false);
  });

  it("allows a blank email but rejects a malformed one", () => {
    expect(applicationInput.safeParse({ ...base, email: "" }).success).toBe(true);
    expect(applicationInput.safeParse({ ...base, email: "bad" }).success).toBe(
      false,
    );
  });

  it("rejects an unknown gender", () => {
    expect(applicationInput.safeParse({ ...base, gender: "X" }).success).toBe(
      false,
    );
  });

  it("requires a valid 12-digit Aadhaar number", () => {
    expect(applicationInput.safeParse(base).success).toBe(true);
    // missing
    expect(
      applicationInput.safeParse({ firstName: "A", phone: "1" }).success,
    ).toBe(false);
    // too short / non-numeric
    expect(
      applicationInput.safeParse({ ...base, aadhaarNumber: "12345" }).success,
    ).toBe(false);
    expect(
      applicationInput.safeParse({ ...base, aadhaarNumber: "abcd12345678" })
        .success,
    ).toBe(false);
  });
});

describe("APPLICATION_STATUSES", () => {
  it("covers the two-stage admissions lifecycle", () => {
    expect(APPLICATION_STATUSES).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "BRANCH_APPROVED",
      "ACCEPTED",
      "REJECTED",
      "CONVERTED",
    ]);
  });
});
