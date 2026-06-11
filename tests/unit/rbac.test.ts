import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  permissionsForRole,
  hasPermission,
} from "@/lib/rbac";

describe("permissionsForRole", () => {
  it("grants Admin every permission", () => {
    expect(permissionsForRole("Admin").sort()).toEqual([...PERMISSIONS].sort());
  });

  it("grants Trainer exactly session.manage + attendance.mark", () => {
    expect(permissionsForRole("Trainer").sort()).toEqual(
      ["attendance.mark", "session.manage"].sort(),
    );
  });

  it("grants Trainee nothing", () => {
    expect(permissionsForRole("Trainee")).toEqual([]);
  });
});

describe("ROLE_PERMISSIONS matrix", () => {
  it("only references known permission keys", () => {
    const known = new Set<string>(PERMISSIONS);
    for (const role of Object.keys(ROLE_PERMISSIONS)) {
      for (const p of ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]) {
        expect(known.has(p)).toBe(true);
      }
    }
  });

  it("covers every non-Admin role", () => {
    const nonAdmin = ROLES.filter((r) => r !== "Admin").sort();
    expect(Object.keys(ROLE_PERMISSIONS).sort()).toEqual(nonAdmin);
  });
});

describe("hasPermission", () => {
  it("is true when the permission is held", () => {
    expect(hasPermission(["attendance.mark"], "attendance.mark")).toBe(true);
  });

  it("is false when missing or undefined", () => {
    expect(hasPermission(["report.view"], "attendance.mark")).toBe(false);
    expect(hasPermission(undefined, "attendance.mark")).toBe(false);
    expect(hasPermission(null, "attendance.mark")).toBe(false);
  });
});
