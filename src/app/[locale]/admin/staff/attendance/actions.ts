"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AttendanceStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId, withDistrictScope } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";

const PERMISSION = "staff.manage" as const;
const STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;

/** Parse a YYYY-MM-DD string to a UTC-midnight Date (matches @db.Date storage). */
function parseDay(raw: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Save the whole day's staff attendance in one submit (one row per staff/day). */
export async function saveStaffAttendance(formData: FormData): Promise<void> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission(PERMISSION);
  const scope = scopedDistrictId(session);

  const date = parseDay((formData.get("date") as string) ?? "");
  if (!date) return;

  // Only staff within the admin's scope can be marked.
  const where: Prisma.PersonWhereInput = withDistrictScope({ kind: "STAFF" }, scope);
  const staff = await prisma.person.findMany({
    where,
    select: { id: true, districtId: true },
  });

  for (const s of staff) {
    const raw = String(formData.get(`status_${s.id}`) ?? "");
    if (!(STATUSES as readonly string[]).includes(raw)) continue;
    const status = raw as AttendanceStatus;
    await prisma.staffAttendance.upsert({
      where: { personId_date: { personId: s.id, date } },
      create: {
        personId: s.id,
        date,
        status,
        districtId: s.districtId,
        markedById: session.user.id,
      },
      update: { status, markedById: session.user.id },
    });
  }
  await writeAudit(session.user.id, "update", "StaffAttendance", date.toISOString().slice(0, 10));

  const day = date.toISOString().slice(0, 10);
  revalidatePath(`/${locale}/admin/staff/attendance`);
  redirect(`/${locale}/admin/staff/attendance?date=${day}&saved=1`);
}
