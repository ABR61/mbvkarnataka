import { beforeEach, afterAll, describe, it, expect } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, seedBasics, makeTrainee } from "./helpers";

beforeEach(resetDb);
afterAll(async () => {
  await resetDb();
  await prisma.$disconnect();
});

describe("unique constraints", () => {
  it("rejects enrolling the same trainee in a cohort twice", async () => {
    const { cohortId } = await seedBasics();
    const trainee = await makeTrainee();
    await prisma.enrollment.create({ data: { personId: trainee.id, cohortId } });
    await expect(
      prisma.enrollment.create({ data: { personId: trainee.id, cohortId } }),
    ).rejects.toThrow();
  });

  it("rejects assigning the same trainer to a cohort twice", async () => {
    const { cohortId } = await seedBasics();
    const trainer = await prisma.person.create({
      data: { kind: "TRAINER", firstName: "Trainer" },
    });
    await prisma.trainerAssignment.create({
      data: { personId: trainer.id, cohortId },
    });
    await expect(
      prisma.trainerAssignment.create({ data: { personId: trainer.id, cohortId } }),
    ).rejects.toThrow();
  });

  it("rejects a duplicate district code", async () => {
    await prisma.district.create({ data: { name: { en: "A" }, code: "DUP" } });
    await expect(
      prisma.district.create({ data: { name: { en: "B" }, code: "DUP" } }),
    ).rejects.toThrow();
  });
});

describe("cascade deletes", () => {
  it("removes enrollments and sessions when a cohort is deleted", async () => {
    const { cohortId, courseId } = await seedBasics();
    const trainee = await makeTrainee();
    await prisma.enrollment.create({ data: { personId: trainee.id, cohortId } });
    await prisma.trainingSession.create({
      data: { cohortId, courseId, sessionDate: new Date("2026-07-01") },
    });

    await prisma.cohort.delete({ where: { id: cohortId } });

    expect(await prisma.enrollment.count()).toBe(0);
    expect(await prisma.trainingSession.count()).toBe(0);
    // The trainee record itself survives.
    expect(await prisma.person.count()).toBe(1);
  });

  it("removes consent records when a person is deleted", async () => {
    const trainee = await makeTrainee();
    await prisma.consentRecord.create({
      data: { personId: trainee.id, consentType: "data_processing", version: "v1" },
    });

    await prisma.person.delete({ where: { id: trainee.id } });

    expect(await prisma.consentRecord.count()).toBe(0);
  });

  it("removes attendance when a session is deleted", async () => {
    const { cohortId, courseId } = await seedBasics();
    const trainee = await makeTrainee();
    const session = await prisma.trainingSession.create({
      data: { cohortId, courseId, sessionDate: new Date("2026-07-01") },
    });
    await prisma.attendance.create({
      data: { sessionId: session.id, personId: trainee.id, status: "PRESENT" },
    });

    await prisma.trainingSession.delete({ where: { id: session.id } });

    expect(await prisma.attendance.count()).toBe(0);
  });
});
