/**
 * Give the Trainer role to any trainer whose login is missing it.
 *
 * Trainers created through the app's "New trainer" form get the role
 * automatically. Logins created any other way (imports, manual database edits)
 * can end up with no role, which means the trainer can't open Sessions to mark
 * class attendance. Safe to re-run.
 *
 *   npx tsx --env-file=.env scripts/fix-trainer-roles.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const role = await prisma.role.findUnique({ where: { name: "Trainer" } });
  if (!role) throw new Error("Trainer role not found — run `npm run db:seed` first.");

  const trainers = await prisma.person.findMany({
    where: { kind: "TRAINER", userId: { not: null }, user: { userRoles: { none: { roleId: role.id } } } },
    select: { firstName: true, userId: true, user: { select: { email: true } } },
  });
  for (const t of trainers) {
    await prisma.userRole.create({ data: { userId: t.userId!, roleId: role.id } });
    console.log(`+ Trainer role → ${t.user?.email ?? t.firstName}`);
  }
  console.log(`Done. ${trainers.length} trainer login(s) fixed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
