import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { certificateSerial, randomCode } from "@/lib/certificate";

/**
 * Issue a certificate for a completed program the moment its participant leaves
 * feedback. Idempotent: if the completion already has a certificate, the existing
 * one is returned. Returns null if the completion or its participant can't be found.
 */
export async function issueCompletionCertificate(
  completionId: string,
  issuedById?: string,
) {
  const existing = await prisma.certificate.findUnique({ where: { completionId } });
  if (existing) return existing;

  const completion = await prisma.completion.findUnique({
    where: { id: completionId },
    include: { program: true, futureProgram: true, user: true },
  });
  if (!completion) return null;

  const person = await prisma.person.findUnique({
    where: { userId: completion.userId },
  });
  if (!person) return null;

  const personName =
    [person.firstName, person.lastName].filter(Boolean).join(" ") ||
    completion.user.name ||
    completion.user.email ||
    "";

  // Snapshot the program name at issue time (Json { en, kn }).
  const title = completion.futureProgram?.title ?? "";
  const programName = (completion.program?.name ?? {
    en: title,
    kn: title,
  }) as Prisma.InputJsonValue;

  const year = new Date().getUTCFullYear();

  return prisma.certificate.create({
    data: {
      completionId,
      personId: person.id,
      serialNumber: certificateSerial(year, randomCode(6)),
      verifyCode: randomCode(16),
      personName,
      programName,
      issuedById,
    },
  });
}
