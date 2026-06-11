import { describe, it, expect } from "vitest";
import { employerInput, placementInput } from "@/lib/validation/placement";

describe("employerInput", () => {
  it("requires a name and validates email when present", () => {
    expect(employerInput.safeParse({ name: "Acme" }).success).toBe(true);
    expect(employerInput.safeParse({ name: "" }).success).toBe(false);
    expect(employerInput.safeParse({ name: "Acme", email: "bad" }).success).toBe(false);
    expect(employerInput.safeParse({ name: "Acme", email: "" }).success).toBe(true);
  });
});

describe("placementInput", () => {
  const base = { personId: "p1", employerId: "e1", placedOn: "2026-03-01", status: "PLACED" as const };

  it("accepts a minimal valid placement", () => {
    expect(placementInput.safeParse(base).success).toBe(true);
  });

  it("allows blank salary/type but rejects bad ones", () => {
    expect(placementInput.safeParse({ ...base, monthlySalary: "", employmentType: "" }).success).toBe(true);
    expect(placementInput.safeParse({ ...base, monthlySalary: "12.999" }).success).toBe(false);
    expect(placementInput.safeParse({ ...base, employmentType: "GIG" }).success).toBe(false);
  });

  it("requires trainee, employer, date and a valid status", () => {
    expect(placementInput.safeParse({ ...base, personId: "" }).success).toBe(false);
    expect(placementInput.safeParse({ ...base, employerId: "" }).success).toBe(false);
    expect(placementInput.safeParse({ ...base, placedOn: "" }).success).toBe(false);
    expect(placementInput.safeParse({ ...base, status: "HIRED" }).success).toBe(false);
  });
});
