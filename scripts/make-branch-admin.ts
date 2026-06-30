// Dev helper: create a Mysuru branch admin + demo trainees in two districts,
// so the district scoping is visible after login. Run with: npx tsx scripts/make-branch-admin.ts
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const mysuru = await prisma.district.findFirst({
    where: { name: { path: ["en"], equals: "Mysuru" } },
  });
  const bidar = await prisma.district.findFirst({
    where: { name: { path: ["en"], equals: "Bidar" } },
  });
  if (!mysuru || !bidar) throw new Error("districts not found");

  const role = await prisma.role.findUniqueOrThrow({ where: { name: "BranchAdmin" } });
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "mysuru@mbv.local" },
    update: { districtId: mysuru.id, passwordHash },
    create: {
      email: "mysuru@mbv.local",
      name: "Mysuru Branch Admin",
      passwordHash,
      districtId: mysuru.id,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: role.id } },
    update: {},
    create: { userId: admin.id, roleId: role.id },
  });

  // Demo trainees: one in Mysuru (visible to the branch admin), one in Bidar (hidden).
  for (const [first, district] of [
    ["Mysuru", mysuru],
    ["Bidar", bidar],
  ] as const) {
    const exists = await prisma.person.findFirst({
      where: { firstName: `${first}Trainee`, kind: "TRAINEE" },
    });
    if (!exists) {
      await prisma.person.create({
        data: {
          kind: "TRAINEE",
          firstName: `${first}Trainee`,
          lastName: "Demo",
          districtId: district.id,
        },
      });
    }
  }

  console.log("✅ Branch admin: mysuru@mbv.local / ChangeMe123! (district: Mysuru)");
  console.log("   Demo trainees: MysuruTrainee (visible), BidarTrainee (hidden).");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
