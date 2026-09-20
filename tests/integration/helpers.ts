import { prisma } from "@/lib/prisma";

// Order matters less with CASCADE, but list every table we touch so each test
// starts from a clean slate.
const TABLES = [
  '"RateLimit"',
  '"Attendance"',
  '"Enrollment"',
  '"TrainerAssignment"',
  "training_sessions",
  '"Cohort"',
  '"Course"',
  '"Program"',
  '"Venue"',
  '"Center"',
  '"ConsentRecord"',
  '"Document"',
  '"Person"',
  '"District"',
];

export async function resetDb(): Promise<void> {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${TABLES.join(",")} RESTART IDENTITY CASCADE`,
  );
}

/** Create a district → center → program → course → cohort chain; return their ids. */
export async function seedBasics() {
  const district = await prisma.district.create({
    data: { name: { en: "Testville" }, code: "TST" },
  });
  const center = await prisma.center.create({
    data: { name: { en: "Test Center" }, districtId: district.id },
  });
  const program = await prisma.program.create({
    data: { name: { en: "Test Program" } },
  });
  const course = await prisma.course.create({
    data: { programId: program.id, name: { en: "Test Course" } },
  });
  const cohort = await prisma.cohort.create({
    data: { programId: program.id, centerId: center.id, code: "TST-01" },
  });
  return {
    districtId: district.id,
    centerId: center.id,
    programId: program.id,
    courseId: course.id,
    cohortId: cohort.id,
  };
}

export function makeTrainee(firstName = "Test") {
  return prisma.person.create({ data: { kind: "TRAINEE", firstName } });
}
