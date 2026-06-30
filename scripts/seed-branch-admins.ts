// Dev helper: create one branch (district) admin login for EVERY district.
// Email = <district-slug>@mbv.local, password = ChangeMe123! (change after first login).
// Run: DATABASE_URL=... npx tsx scripts/seed-branch-admins.ts
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: "BranchAdmin" } });
  const districts = await prisma.district.findMany();
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  const created: { district: string; email: string }[] = [];
  for (const d of districts) {
    const name = (d.name as { en: string }).en;
    const email = `${slug(name)}@mbv.local`;
    const user = await prisma.user.upsert({
      where: { email },
      update: { districtId: d.id, passwordHash },
      create: {
        email,
        name: `${name} Branch Admin`,
        passwordHash,
        districtId: d.id,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
    created.push({ district: name, email });
  }

  created.sort((a, b) => a.district.localeCompare(b.district));
  console.log(`✅ ${created.length} branch admins (password: ChangeMe123!)\n`);
  for (const c of created) {
    console.log(`  ${c.district.padEnd(20)} ${c.email}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
