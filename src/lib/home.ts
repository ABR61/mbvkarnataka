import "server-only";
import { prisma } from "@/lib/prisma";

/** The signed-in area a user belongs in. */
export type Home = "admin" | "trainer" | "portal";

/**
 * Trainers go to their trainer area (daily arrival/departure; it links on to
 * Sessions for class attendance). Other staff — anyone holding a permission —
 * go to the admin back-office. Everyone else (trainees) goes to the portal.
 *
 * The Trainer role carries staff permissions, so permissions alone can't tell a
 * trainer apart from other staff — the linked Person's kind decides.
 */
export async function homeFor(userId: string, permissions: readonly string[]): Promise<Home> {
  const person = await prisma.person.findUnique({
    where: { userId },
    select: { kind: true },
  });
  if (person?.kind === "TRAINER") return "trainer";
  return permissions.length > 0 ? "admin" : "portal";
}

/** Same decision from an email address, for use right after signing in. */
export async function homeForEmail(email: string): Promise<Home> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      person: { select: { kind: true } },
      userRoles: { select: { role: { select: { _count: { select: { rolePermissions: true } } } } } },
    },
  });
  if (user?.person?.kind === "TRAINER") return "trainer";
  const hasPermissions = (user?.userRoles ?? []).some((ur) => ur.role._count.rolePermissions > 0);
  return hasPermissions ? "admin" : "portal";
}

export const homePath = (home: Home, locale: string) => `/${locale}/${home}`;
