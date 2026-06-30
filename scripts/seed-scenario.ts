// A coherent end-to-end scenario so every admin section has connected, realistic
// data: a funded Tailoring batch at the Mysuru centre, with a trainer, venue,
// enrolled trainees, attendance, a placement, and the finances behind it.
// Idempotent. Run: DATABASE_URL=... npx tsx scripts/seed-scenario.ts
import { prisma } from "../src/lib/prisma";

async function main() {
  const district = await prisma.district.findFirst({ where: { name: { path: ["en"], equals: "Mysuru" } } });
  const program = await prisma.program.findFirst({ where: { name: { path: ["en"], equals: "Tailoring & Garment Making" } } });
  const center = await prisma.center.findFirst({ where: { name: { path: ["en"], equals: "MBV Mysuru City Centre" } } });
  const cohort = await prisma.cohort.findFirst({ where: { code: "TGM-2026-A" } });
  if (!district || !program || !center || !cohort) throw new Error("base data missing — run seed-demo + _centers + _sessions first");

  // 1. Venue at the Mysuru centre, and attach the cohort's sessions to it.
  let venue = await prisma.venue.findFirst({ where: { centerId: center.id, name: "Training Hall A" } });
  if (!venue) venue = await prisma.venue.create({ data: { centerId: center.id, name: "Training Hall A", capacity: 30 } });
  await prisma.trainingSession.updateMany({ where: { cohortId: cohort.id, venueId: null }, data: { venueId: venue.id } });

  // 2. Trainer (Person kind TRAINER) + assignment to the cohort.
  let trainer = await prisma.person.findFirst({ where: { firstName: "Geetha", kind: "TRAINER", districtId: district.id } });
  if (!trainer) trainer = await prisma.person.create({ data: { kind: "TRAINER", firstName: "Geetha", lastName: "Rao", districtId: district.id, phone: "9845011111" } });
  if (!(await prisma.trainerAssignment.findFirst({ where: { personId: trainer.id, cohortId: cohort.id } })))
    await prisma.trainerAssignment.create({ data: { personId: trainer.id, cohortId: cohort.id, role: "lead" } });
  await prisma.trainingSession.updateMany({ where: { cohortId: cohort.id, trainerId: null }, data: { trainerId: trainer.id } });

  // 3. Enroll two Mysuru trainees into the cohort (one completed → placeable).
  const anjali = await prisma.person.findFirst({ where: { firstName: "Anjali", kind: "TRAINEE", districtId: district.id } });
  const ravi = await prisma.person.findFirst({ where: { firstName: "Ravi Kumar", kind: "TRAINEE", districtId: district.id } });
  async function enroll(personId: string, status: "ENROLLED" | "COMPLETED") {
    let e = await prisma.enrollment.findFirst({ where: { personId, cohortId: cohort!.id } });
    if (!e) e = await prisma.enrollment.create({ data: { personId, cohortId: cohort!.id, status } });
    return e;
  }
  const anjaliEnr = anjali ? await enroll(anjali.id, "COMPLETED") : null;
  if (ravi) await enroll(ravi.id, "ENROLLED");

  // 4. Attendance on the first session.
  const firstSession = await prisma.trainingSession.findFirst({ where: { cohortId: cohort.id }, orderBy: { sessionDate: "asc" } });
  if (firstSession) {
    for (const [p, st] of [[anjali, "PRESENT"], [ravi, "PRESENT"]] as const) {
      if (p && !(await prisma.attendance.findFirst({ where: { sessionId: firstSession.id, personId: p.id } })))
        await prisma.attendance.create({ data: { sessionId: firstSession.id, personId: p.id, status: st } });
    }
  }

  // 5. Employer + placement of the graduate.
  let employer = await prisma.employer.findFirst({ where: { name: "Mysore Silk Garments Pvt Ltd" } });
  if (!employer) employer = await prisma.employer.create({ data: { name: "Mysore Silk Garments Pvt Ltd", sector: "Apparel", contactPerson: "HR Manager", phone: "9845022222", districtId: district.id } });
  if (anjali && !(await prisma.placement.findFirst({ where: { personId: anjali.id, employerId: employer.id } })))
    await prisma.placement.create({ data: { personId: anjali.id, employerId: employer.id, enrollmentId: anjaliEnr?.id, jobTitle: "Tailor", employmentType: "FULL_TIME", monthlySalary: "12000", placedOn: new Date(), status: "PLACED" } });

  // 6. Finance: grant, budget, vendor, expense — all tied to the program/cohort.
  if (!(await prisma.grant.findFirst({ where: { funder: "Karnataka Skill Development Corporation" } })))
    await prisma.grant.create({ data: { funder: "Karnataka Skill Development Corporation", amount: "500000", reference: "KSDC/2026/MBV/014", receivedOn: new Date() } });
  await prisma.budget.upsert({ where: { programId: program.id }, update: {}, create: { programId: program.id, amount: "300000", note: "FY 2026 tailoring programme budget" } });
  let vendor = await prisma.vendor.findFirst({ where: { name: "Singer Sewing Supplies" } });
  if (!vendor) vendor = await prisma.vendor.create({ data: { name: "Singer Sewing Supplies", contactPerson: "Sales Desk", phone: "9845033333" } });
  if (!(await prisma.expense.findFirst({ where: { vendorId: vendor.id, cohortId: cohort.id } })))
    await prisma.expense.create({ data: { amount: "45000", incurredOn: new Date(), category: "Equipment", status: "APPROVED", programId: program.id, cohortId: cohort.id, centerId: center.id, vendorId: vendor.id, note: "10 sewing machines for the batch" } });

  const c = {
    venues: await prisma.venue.count(), trainers: await prisma.person.count({ where: { kind: "TRAINER" } }),
    enrollments: await prisma.enrollment.count(), attendance: await prisma.attendance.count(),
    employers: await prisma.employer.count(), placements: await prisma.placement.count(),
    grants: await prisma.grant.count(), budgets: await prisma.budget.count(),
    vendors: await prisma.vendor.count(), expenses: await prisma.expense.count(),
  };
  console.log("✅ Scenario seeded:", c);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
