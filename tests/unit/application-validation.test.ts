import { describe, it, expect } from "vitest";
import {
  applicationInput,
  APPLICATION_STATUSES,
} from "@/lib/validation/application";

describe("applicationInput", () => {
  it("requires firstName and phone", () => {
    expect(
      applicationInput.safeParse({ firstName: "Asha", phone: "9876500000" })
        .success,
    ).toBe(true);

    expect(
      applicationInput.safeParse({ firstName: "", phone: "9876500000" }).success,
    ).toBe(false);

    expect(
      applicationInput.safeParse({ firstName: "Asha", phone: "" }).success,
    ).toBe(false);
  });

  it("allows a blank email but rejects a malformed one", () => {
    expect(
      applicationInput.safeParse({ firstName: "A", phone: "1", email: "" })
        .success,
    ).toBe(true);
    expect(
      applicationInput.safeParse({ firstName: "A", phone: "1", email: "bad" })
        .success,
    ).toBe(false);
  });

  it("rejects an unknown gender", () => {
    expect(
      applicationInput.safeParse({ firstName: "A", phone: "1", gender: "X" })
        .success,
    ).toBe(false);
  });
});

describe("APPLICATION_STATUSES", () => {
  it("covers the admissions lifecycle", () => {
    expect(APPLICATION_STATUSES).toEqual([
      "SUBMITTED",
      "UNDER_REVIEW",
      "ACCEPTED",
      "REJECTED",
      "CONVERTED",
    ]);
  });
});
