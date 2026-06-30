import { describe, it, expect } from "vitest";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";

// Security contract: a branch (district) admin must only ever see/manage records
// in their own district; a super admin (no districtId) sees everything.
describe("scopedDistrictId", () => {
  it("returns the district id for a branch-scoped user", () => {
    expect(scopedDistrictId({ user: { districtId: "dist-1" } })).toBe("dist-1");
  });

  it("returns null for a super admin (no districtId)", () => {
    expect(scopedDistrictId({ user: { districtId: null } })).toBeNull();
    expect(scopedDistrictId({ user: {} })).toBeNull();
  });

  it("returns null for an anonymous session", () => {
    expect(scopedDistrictId(null)).toBeNull();
  });
});

describe("withDistrictScope", () => {
  it("injects the districtId filter for a branch-scoped user", () => {
    const where = { kind: "TRAINEE" as const };
    expect(withDistrictScope(where, "dist-1")).toEqual({
      kind: "TRAINEE",
      districtId: "dist-1",
    });
  });

  it("leaves the filter unrestricted for a super admin", () => {
    const where = { kind: "TRAINEE" as const };
    expect(withDistrictScope(where, null)).toEqual({ kind: "TRAINEE" });
  });

  it("does not let a passed-in districtId override the scoped one", () => {
    // Even if a caller's filter names another district, the branch scope wins.
    const where = { districtId: "other-district" };
    expect(withDistrictScope(where, "dist-1")).toEqual({ districtId: "dist-1" });
  });
});
