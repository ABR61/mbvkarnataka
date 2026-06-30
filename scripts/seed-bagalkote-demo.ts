// Dev demo: a few applications + a trainee for Bagalkote, so the branch admin's
// dashboard KPIs and Applications list show data. All names prefixed "Demo " for
// easy cleanup. Run: DATABASE_URL=... npx tsx scripts/seed-bagalkote-demo.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  const d = await prisma.district.findFirst({
    where: { name: { path: ["en"], equals: "Bagalkote" } },
  });
  if (!d) throw new Error("Bagalkote not found");

  const applicants = [
    { firstName: "Demo Asha", phone: "9000000001", status: "SUBMITTED" as const },
    { firstName: "Demo Ravi", phone: "9000000002", status: "SUBMITTED" as const },
    { firstName: "Demo Lata", phone: "9000000003", status: "UNDER_REVIEW" as const },
  ];
  for (const a of applicants) {
    const exists = await prisma.application.findFirst({
      where: { firstName: a.firstName, districtId: d.id },
    });
    if (!exists) {
      await prisma.application.create({
        data: {
          firstName: a.firstName,
          lastName: "Demo",
          phone: a.phone,
          districtId: d.id,
          status: a.status,
        },
      });
    }
  }

  const t = await prisma.person.findFirst({
    where: { firstName: "Demo Trainee", districtId: d.id, kind: "TRAINEE" },
  });
  if (!t) {
    await prisma.person.create({
      data: {
        kind: "TRAINEE",
        firstName: "Demo Trainee",
        lastName: "Bagalkote",
        districtId: d.id,
      },
    });
  }

  console.log("✅ Bagalkote demo: 3 applications (2 submitted, 1 under review) + 1 trainee.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
