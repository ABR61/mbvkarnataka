import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import {
  PERMISSIONS,
  ROLES,
  permissionsForRole,
  type RoleName,
} from "../src/lib/rbac";
import { KARNATAKA_DISTRICTS } from "../src/lib/karnataka-districts";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Roles & permissions (single source of truth: src/lib/rbac.ts)
  for (const name of ROLES) {
    await prisma.role.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  // Wire up the role → permission matrix. Idempotent: removes stale grants and adds
  // missing ones so re-running the seed always converges to the matrix in rbac.ts.
  const roleRows = await prisma.role.findMany();
  const permissionRows = await prisma.permission.findMany();
  const permIdByKey = new Map(permissionRows.map((p) => [p.key, p.id]));

  for (const role of roleRows) {
    const wantKeys = permissionsForRole(role.name as RoleName);
    const wantIds = new Set(
      wantKeys.map((k) => permIdByKey.get(k)).filter((id): id is string => !!id),
    );

    // Add missing grants.
    for (const permissionId of wantIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
    }
    // Remove grants no longer in the matrix.
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id, permissionId: { notIn: [...wantIds] } },
    });
  }

  // Seed admin user
  const admin = await prisma.role.findUniqueOrThrow({ where: { name: "Admin" } });
  const email = "admin@mbv.local";
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "MBV Admin", passwordHash, locale: "en" },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: admin.id } },
    update: {},
    create: { userId: user.id, roleId: admin.id },
  });

  // All 31 Karnataka districts (src/lib/karnataka-districts.ts)
  for (const d of KARNATAKA_DISTRICTS) {
    await prisma.district.upsert({
      where: { code: d.code },
      update: { name: d.name },
      create: d,
    });
  }

  console.log(
    `✅ Seed complete. ${ROLES.length} roles, ${PERMISSIONS.length} permissions, ` +
      `${KARNATAKA_DISTRICTS.length} districts. Admin login → admin@mbv.local / ChangeMe123!`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
