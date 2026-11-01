import "server-only";
import { prisma } from "@/lib/prisma";
import {
  findDoubleBookings,
  isBelowMinimum,
  markingWindow,
  sessionFlags,
  summarizeAttendance,
  type AttendanceSummary,
} from "@/lib/attendance-rules";
import { todayISO } from "@/lib/dates";

/** Sessions of a cohort that have been held — i.e. attendance was marked for
 *  at least one trainee — excluding cancelled ones. */
export async function heldSessionIds(cohortId: string): Promise<string[]> {
  const sessions = await prisma.trainingSession.findMany({
    where: { cohortId, status: { not: "CANCELLED" }, attendances: { some: {} } },
    select: { id: true },
  });
  return sessions.map((s) => s.id);
}

/** Attendance summary for every trainee in a cohort, keyed by personId, plus
 *  the program's minimum. */
export async function cohortAttendance(cohortId: string): Promise<{
  min: number;
  byPerson: Map<string, AttendanceSummary>;
}> {
  const [cohort, held] = await Promise.all([
    prisma.cohort.findUnique({
      where: { id: cohortId },
      select: { program: { select: { minAttendancePct: true } }, enrollments: { select: { personId: true } } },
    }),
    heldSessionIds(cohortId),
  ]);
  const rows = held.length
    ? await prisma.attendance.findMany({
        where: { sessionId: { in: held } },
        select: { personId: true, sessionId: true, status: true },
      })
    : [];
  const rowsByPerson = new Map<string, { sessionId: string; status: string }[]>();
  for (const r of rows) {
    rowsByPerson.set(r.personId, [...(rowsByPerson.get(r.personId) ?? []), r]);
  }
  const byPerson = new Map<string, AttendanceSummary>();
  for (const e of cohort?.enrollments ?? []) {
    byPerson.set(e.personId, summarizeAttendance(held, rowsByPerson.get(e.personId) ?? []));
  }
  return { min: cohort?.program.minAttendancePct ?? 80, byPerson };
}

/** One trainee's attendance in one cohort. */
export async function traineeAttendance(cohortId: string, personId: string) {
  const { min, byPerson } = await cohortAttendance(cohortId);
  return { min, summary: byPerson.get(personId) ?? summarizeAttendance([], []) };
}

const personName = (p: { firstName: string; lastName: string | null }) =>
  [p.firstName, p.lastName].filter(Boolean).join(" ");

export type IntegrityReport = Awaited<ReturnType<typeof integrityReport>>;

/**
 * Everything a reviewer should look at, for the last `days` days: evidence
 * gaps, unmarked past sessions, trainees "present" in two places, cohorts with
 * a suspicious perfect record, and trainees below their program's minimum.
 * `districtId` limits it to one branch (branch admins); null = everywhere.
 */
export async function integrityReport(districtId: string | null, days = 30) {
  const now = new Date();
  const today = new Date(`${todayISO(now)}T00:00:00.000Z`);
  const since = new Date(today);
  since.setUTCDate(since.getUTCDate() - days);
  const inScope = districtId ? { cohort: { center: { districtId } } } : {};

  const sessions = await prisma.trainingSession.findMany({
    where: { sessionDate: { gte: since, lte: today }, status: { not: "CANCELLED" }, ...inScope },
    select: {
      id: true,
      sessionDate: true,
      startTime: true,
      endTime: true,
      photoUrl: true,
      markedLat: true,
      markedDistanceM: true,
      markedAccuracyM: true,
      cohortId: true,
      course: { select: { name: true } },
      cohort: { select: { code: true, center: { select: { id: true, name: true, latitude: true, longitude: true } } } },
      _count: { select: { attendances: true } },
    },
    orderBy: { sessionDate: "desc" },
  });

  const label = (s: (typeof sessions)[number]) => ({
    id: s.id,
    date: s.sessionDate,
    course: s.course.name,
    cohortCode: s.cohort.code,
    center: s.cohort.center.name,
  });

  // 1) Evidence gaps on marked sessions.
  const evidence = sessions
    .filter((s) => s._count.attendances > 0)
    .map((s) => ({
      ...label(s),
      flags: sessionFlags({
        photoUrl: s.photoUrl,
        markedLat: s.markedLat,
        markedDistanceM:
          s.markedDistanceM != null ? Math.max(0, s.markedDistanceM - (s.markedAccuracyM ?? 0)) : null,
        centerMapped: s.cohort.center.latitude != null && s.cohort.center.longitude != null,
      }),
    }))
    .filter((s) => s.flags.length > 0);

  // 2) Past sessions (window closed) with no attendance at all.
  const unmarked = sessions
    .filter((s) => s._count.attendances === 0 && markingWindow(s.sessionDate, now) === "locked")
    .map(label);

  // 3) Same trainee present/late in two places at once.
  const sessionIds = sessions.map((s) => s.id);
  const presentRows = sessionIds.length
    ? await prisma.attendance.findMany({
        where: { sessionId: { in: sessionIds }, status: { in: ["PRESENT", "LATE"] } },
        select: { personId: true, sessionId: true },
      })
    : [];
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const doubles = findDoubleBookings(
    presentRows.map((r) => {
      const s = byId.get(r.sessionId)!;
      return {
        personId: r.personId,
        sessionId: r.sessionId,
        date: s.sessionDate.toISOString().slice(0, 10),
        centerId: s.cohort.center.id,
        startTime: s.startTime,
        endTime: s.endTime,
      };
    }),
  );
  const doublePeople = doubles.length
    ? await prisma.person.findMany({
        where: { id: { in: [...new Set(doubles.map((d) => d.personId))] } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const doubleBookings = doubles.map((d) => ({
    person: personName(doublePeople.find((p) => p.id === d.personId) ?? { firstName: "—", lastName: null }),
    personId: d.personId,
    a: label(byId.get(d.sessionIds[0])!),
    b: label(byId.get(d.sessionIds[1])!),
  }));

  // 4) Cohorts where every single mark is "present" over 5+ held sessions.
  const cohortIds = [...new Set(sessions.map((s) => s.cohortId))];
  const perfect = cohortIds.length
    ? await prisma.$queryRaw<{ cohortId: string; held: bigint; nonPresent: bigint }[]>`
        SELECT ts."cohortId" AS "cohortId",
               COUNT(DISTINCT ts.id) AS held,
               COUNT(*) FILTER (WHERE a.status <> 'PRESENT') AS "nonPresent"
        FROM "Attendance" a
        JOIN training_sessions ts ON ts.id = a."sessionId"
        WHERE ts."cohortId" = ANY(${cohortIds})
          AND ts.status <> 'CANCELLED'
        GROUP BY ts."cohortId"
      `
    : [];
  const perfectIds = perfect
    .filter((r) => Number(r.held) >= 5 && Number(r.nonPresent) === 0)
    .map((r) => ({ id: r.cohortId, held: Number(r.held) }));
  const perfectCohorts = perfectIds.length
    ? (
        await prisma.cohort.findMany({
          where: { id: { in: perfectIds.map((p) => p.id) } },
          select: { id: true, code: true, program: { select: { name: true } }, center: { select: { name: true } } },
        })
      ).map((c) => ({ ...c, held: perfectIds.find((p) => p.id === c.id)!.held }))
    : [];

  // 5) Trainees below their program minimum in active cohorts.
  const activeCohorts = await prisma.cohort.findMany({
    where: { status: "ACTIVE", ...(districtId ? { center: { districtId } } : {}) },
    select: {
      id: true,
      code: true,
      program: { select: { name: true } },
      enrollments: {
        where: { status: "ENROLLED" },
        select: { person: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
  });
  const lowAttendance: {
    personId: string;
    person: string;
    cohortId: string;
    cohortCode: string | null;
    program: unknown;
    pct: number;
    min: number;
    attended: number;
    held: number;
  }[] = [];
  for (const c of activeCohorts) {
    const { min, byPerson } = await cohortAttendance(c.id);
    for (const e of c.enrollments) {
      const s = byPerson.get(e.person.id);
      if (s && isBelowMinimum(s.pct, min)) {
        lowAttendance.push({
          personId: e.person.id,
          person: personName(e.person),
          cohortId: c.id,
          cohortCode: c.code,
          program: c.program.name,
          pct: s.pct!,
          min,
          attended: s.attended,
          held: s.held - s.excused,
        });
      }
    }
  }
  lowAttendance.sort((a, b) => a.pct - b.pct);

  return { days, evidence, unmarked, doubleBookings, perfectCohorts, lowAttendance };
}

/** Pending correction requests, newest first, limited to one district if given. */
export async function pendingCorrections(districtId: string | null) {
  const rows = await prisma.attendanceCorrection.findMany({
    where: {
      status: "PENDING",
      ...(districtId ? { session: { cohort: { center: { districtId } } } } : {}),
    },
    include: {
      person: { select: { firstName: true, lastName: true } },
      session: {
        select: {
          id: true,
          sessionDate: true,
          course: { select: { name: true } },
          cohort: { select: { code: true } },
        },
      },
    },
    orderBy: { requestedAt: "desc" },
  });
  const ids = [...new Set(rows.map((r) => r.requestedById).filter((x): x is string => !!x))];
  const users = ids.length
    ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } })
    : [];
  return rows.map((r) => ({
    ...r,
    personName: personName(r.person),
    requestedBy: (() => {
      const u = users.find((x) => x.id === r.requestedById);
      return u ? (u.name ?? u.email ?? "—") : "—";
    })(),
  }));
}

export type TraineeAttendanceRow = {
  person: string;
  phone: string | null;
  cohortId: string;
  cohortCode: string | null;
  program: unknown;
  center: unknown;
  district: unknown;
  enrollmentStatus: string;
  summary: AttendanceSummary;
  min: number;
};

/** Attendance for every trainee in every cohort that has held sessions —
 *  the data behind the attendance report and its CSV export. */
export async function attendanceReport(): Promise<{
  cohorts: {
    id: string;
    code: string | null;
    program: unknown;
    center: unknown;
    held: number;
    trainees: number;
    avgPct: number | null;
    below: number;
    min: number;
  }[];
  trainees: TraineeAttendanceRow[];
}> {
  const cohorts = await prisma.cohort.findMany({
    where: { sessions: { some: { attendances: { some: {} } } } },
    select: {
      id: true,
      code: true,
      program: { select: { name: true } },
      center: { select: { name: true, district: { select: { name: true } } } },
      enrollments: {
        select: { status: true, person: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const cohortRows = [];
  const trainees: TraineeAttendanceRow[] = [];
  for (const c of cohorts) {
    const { min, byPerson } = await cohortAttendance(c.id);
    const pcts: number[] = [];
    let below = 0;
    let held = 0;
    for (const e of c.enrollments) {
      const s = byPerson.get(e.person.id);
      if (!s) continue;
      held = Math.max(held, s.held);
      if (s.pct !== null) pcts.push(s.pct);
      if (isBelowMinimum(s.pct, min)) below++;
      trainees.push({
        person: personName(e.person),
        phone: e.person.phone,
        cohortId: c.id,
        cohortCode: c.code,
        program: c.program.name,
        center: c.center.name,
        district: c.center.district.name,
        enrollmentStatus: e.status,
        summary: s,
        min,
      });
    }
    cohortRows.push({
      id: c.id,
      code: c.code,
      program: c.program.name,
      center: c.center.name,
      held,
      trainees: c.enrollments.length,
      avgPct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      below,
      min,
    });
  }
  return { cohorts: cohortRows, trainees };
}
