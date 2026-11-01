"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guards";
import type { FormState } from "@/lib/forms";
import { nowHHMM, todayISO } from "@/lib/dates";

/** Today's date in India as a UTC-midnight Date + India time "HH:MM".
 *  Uses IST explicitly — the server's own clock zone is usually UTC. */
function nowParts() {
  const now = new Date();
  return { date: new Date(`${todayISO(now)}T00:00:00.000Z`), time: nowHHMM(now) };
}

async function ownTrainer(userId: string) {
  const person = await prisma.person.findUnique({ where: { userId } });
  return person && person.kind === "TRAINER" ? person : null;
}

/** Trainer marks their own arrival (login) for today. */
export async function trainerCheckIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requireAuth();
  const person = await ownTrainer(session.user.id);
  if (!person) return { error: "notTrainer" };

  const { date, time } = nowParts();
  const existing = await prisma.staffAttendance.findUnique({
    where: { personId_date: { personId: person.id, date } },
  });
  if (existing?.checkIn) return { ok: true, error: "alreadyIn" };

  await prisma.staffAttendance.upsert({
    where: { personId_date: { personId: person.id, date } },
    create: {
      personId: person.id,
      date,
      status: "PRESENT",
      checkIn: time,
      districtId: person.districtId,
      markedById: session.user.id,
    },
    update: { status: "PRESENT", checkIn: time },
  });

  revalidatePath(`/${locale}/trainer`);
  return { ok: true };
}

/** Trainer marks their own departure (logout) for today. */
export async function trainerCheckOut(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requireAuth();
  const person = await ownTrainer(session.user.id);
  if (!person) return { error: "notTrainer" };

  const { date, time } = nowParts();
  const existing = await prisma.staffAttendance.findUnique({
    where: { personId_date: { personId: person.id, date } },
  });
  if (!existing?.checkIn) return { error: "notInYet" };

  await prisma.staffAttendance.update({
    where: { id: existing.id },
    data: { checkOut: time },
  });

  revalidatePath(`/${locale}/trainer`);
  return { ok: true };
}
