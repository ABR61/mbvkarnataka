import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  "Admin",
  "Coordinator",
  "CenterManager",
  "Trainer",
  "Finance",
  "Placement",
  "Trainee",
];

const PERMISSIONS = [
  "user.manage",
  "center.manage",
  "cohort.manage",
  "session.manage",
  "attendance.mark",
  "trainee.manage",
  "trainer.manage",
  "report.view",
];

async function main() {
  // Roles & permissions
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

  // Admin gets every permission
  const admin = await prisma.role.findUniqueOrThrow({ where: { name: "Admin" } });
  const permissions = await prisma.permission.findMany();
  for (const p of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: p.id } },
      update: {},
      create: { roleId: admin.id, permissionId: p.id },
    });
  }

  // Seed admin user
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

  // A couple of sample districts
  const districts = [
    { code: "BLR-U", name: { en: "Bengaluru Urban", kn: "ಬೆಂಗಳೂರು ನಗರ" } },
    { code: "MYS", name: { en: "Mysuru", kn: "ಮೈಸೂರು" } },
  ];
  for (const d of districts) {
    await prisma.district.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
  }

  console.log("✅ Seed complete. Admin login → admin@mbv.local / ChangeMe123!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
