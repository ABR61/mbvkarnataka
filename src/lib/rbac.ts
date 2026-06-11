// Single source of truth for RBAC: roles, permissions, and the role→permission matrix.
// PURE module — no next/react/prisma imports — so the Prisma seed (run via tsx) and the
// Auth.js callbacks (run in the Next server) can both import it.

export const PERMISSIONS = [
  "user.manage", // create/edit users, assign roles
  "center.manage", // districts, centers, venues
  "cohort.manage", // programs, courses, cohorts, enrollment
  "session.manage", // schedule sessions
  "attendance.mark", // mark attendance for a session
  "trainee.manage", // trainee (Person) records
  "trainer.manage", // trainer records & assignments
  "report.view", // dashboards & exports
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  "Admin",
  "CenterManager",
  "Coordinator",
  "Trainer",
  "Finance",
  "Placement",
  "Trainee",
] as const;

export type RoleName = (typeof ROLES)[number];

// Permissions held by each non-Admin role. Admin implicitly holds ALL permissions
// (see grantAll below), so it is intentionally omitted from this matrix.
export const ROLE_PERMISSIONS: Record<Exclude<RoleName, "Admin">, Permission[]> = {
  CenterManager: [
    "center.manage",
    "cohort.manage",
    "session.manage",
    "trainee.manage",
    "trainer.manage",
    "report.view",
  ],
  Coordinator: [
    "cohort.manage",
    "session.manage",
    "trainee.manage",
    "report.view",
  ],
  Trainer: ["session.manage", "attendance.mark"],
  Finance: ["report.view"],
  Placement: ["report.view"],
  Trainee: [],
};

/** Resolve the full permission set for a role, expanding Admin to every permission. */
export function permissionsForRole(role: RoleName): Permission[] {
  if (role === "Admin") return [...PERMISSIONS];
  return ROLE_PERMISSIONS[role];
}

/** True if the held permission list (e.g. from the session) includes `key`. */
export function hasPermission(
  held: readonly string[] | undefined | null,
  key: Permission,
): boolean {
  return !!held && held.includes(key);
}
