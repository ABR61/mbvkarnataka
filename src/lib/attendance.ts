import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  findDoubleBookings,
  isBelowMinimum,
  LOCATION_RADIUS_M,
  markingWindow,
  sessionFlags,
  summarizeAttendance,
  summaryFromCounts,
  type AttendanceSummary,
} from "@/lib/attendance-rules";
import { todayISO } from "@/lib/dates";

/** Attendance summary for every trainee in a cohort, keyed by personId, plus
 *  the program's minimum. (One aggregate query — see cohortsAttendance.) */
export async function cohortAttendance(cohortId: string): Promise<{
  min: number;
  byPerson: Map<string, AttendanceSummary>;
}> {
  const r = (await cohortsAttendance([cohortId])).get(cohortId);
  return { min: r?.min ?? 80, byPerson: r?.byPerson ?? new Map() };
}

/** One trainee's attendance in one cohort. */
export async function traineeAttendance(cohortId: string, personId: string) {
  const r = (await cohortsAttendance([cohortId], { personId })).get(cohortId);
  return { min: r?.min ?? 80, summary: r?.byPerson.get(personId) ?? summarizeAttendance([], []) };
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

  // Which sessions have a class photo — fetched as ids only, so we never load
  // the photos themselves (they can be large inline images without R2).
  const withPhoto = new Set(
    (
      await prisma.trainingSession.findMany({
        where: { id: { in: sessions.map((x) => x.id) }, photoUrl: { not: null } },
        select: { id: true },
      })
    ).map((x) => x.id),
  );

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
        photoUrl: withPhoto.has(s.id) ? "yes" : null,
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
  const activeStats = await cohortsAttendance(activeCohorts.map((c) => c.id));
  for (const c of activeCohorts) {
    const { min, byPerson } = activeStats.get(c.id) ?? { min: 80, byPerson: new Map() };
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

  // 6) QR self check-ins without a location, or from far away (e.g. a
  //    forwarded code). Each needs a human look.
  const selfRows = sessionIds.length
    ? await prisma.attendance.findMany({
        where: { sessionId: { in: sessionIds }, selfCheckedInAt: { not: null } },
        select: {
          sessionId: true,
          checkInLat: true,
          checkInDistanceM: true,
          checkInAccuracyM: true,
          person: { select: { firstName: true, lastName: true } },
        },
      })
    : [];
  const selfCheckins = selfRows
    .map((r) => {
      const far =
        r.checkInDistanceM != null &&
        Math.max(0, r.checkInDistanceM - (r.checkInAccuracyM ?? 0)) > LOCATION_RADIUS_M;
      const reason: "noLocation" | "far" | null = r.checkInLat == null ? "noLocation" : far ? "far" : null;
      return { person: personName(r.person), session: label(byId.get(r.sessionId)!), reason, distanceM: r.checkInDistanceM };
    })
    .filter((r): r is typeof r & { reason: "noLocation" | "far" } => r.reason !== null);

  return { days, evidence, unmarked, doubleBookings, perfectCohorts, lowAttendance, selfCheckins };
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
  const stats = await cohortsAttendance(cohorts.map((c) => c.id));
  for (const c of cohorts) {
    const { min, byPerson } = stats.get(c.id) ?? { min: 80, byPerson: new Map() };
    const pcts: number[] = [];
    let below = 0;
    let held = 0;
    for (const e of c.enrollments) {
      const s = byPerson.get(e.person.id);
      if (!s) continue;
      held = Math.max(held, s.held);
      // Dropped trainees are listed (CSV) but don't count toward the cohort's
      // average or its below-minimum figure.
      if (e.status !== "DROPPED") {
        if (s.pct !== null) pcts.push(s.pct);
        if (isBelowMinimum(s.pct, min)) below++;
      }
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

/**
 * Attendance summaries for many cohorts in ONE aggregate query (plus one for
 * program minimums), instead of loading every attendance row cohort by cohort.
 * Same rules as summarizeAttendance: only held (marked, non-cancelled) sessions
 * count; present/late = attended; excused leaves the denominator.
 * Optionally limited to one person (e.g. the trainee portal).
 */
export async function cohortsAttendance(
  cohortIds: readonly string[],
  opts: { personId?: string } = {},
): Promise<
  Map<string, { min: number; byPerson: Map<string, AttendanceSummary & { enrollmentStatus: string }> }>
> {
  const out = new Map<
    string,
    { min: number; byPerson: Map<string, AttendanceSummary & { enrollmentStatus: string }> }
  >();
  if (cohortIds.length === 0) return out;
  const ids = [...cohortIds];
  const personFilter = opts.personId ? Prisma.sql`AND e."personId" = ${opts.personId}` : Prisma.empty;

  const [rows, mins] = await Promise.all([
    prisma.$queryRaw<
      { cohortId: string; personId: string; enrollmentStatus: string; held: number; attended: number; excused: number }[]
    >`
      WITH held AS (
        SELECT ts.id, ts."cohortId"
        FROM training_sessions ts
        WHERE ts."cohortId" = ANY(${ids})
          AND ts.status <> 'CANCELLED'
          AND EXISTS (SELECT 1 FROM "Attendance" x WHERE x."sessionId" = ts.id)
      ),
      held_count AS (
        SELECT "cohortId", COUNT(*)::int AS n FROM held GROUP BY "cohortId"
      ),
      marks AS (
        SELECT h."cohortId", a."personId",
               COUNT(*) FILTER (WHERE a.status IN ('PRESENT', 'LATE'))::int AS attended,
               COUNT(*) FILTER (WHERE a.status = 'EXCUSED')::int AS excused
        FROM held h
        JOIN "Attendance" a ON a."sessionId" = h.id
        GROUP BY h."cohortId", a."personId"
      )
      SELECT e."cohortId", e."personId", e.status::text AS "enrollmentStatus",
             COALESCE(hc.n, 0) AS held,
             COALESCE(m.attended, 0) AS attended,
             COALESCE(m.excused, 0) AS excused
      FROM "Enrollment" e
      LEFT JOIN held_count hc ON hc."cohortId" = e."cohortId"
      LEFT JOIN marks m ON m."cohortId" = e."cohortId" AND m."personId" = e."personId"
      WHERE e."cohortId" = ANY(${ids}) ${personFilter}
    `,
    prisma.cohort.findMany({
      where: { id: { in: ids } },
      select: { id: true, program: { select: { minAttendancePct: true } } },
    }),
  ]);

  for (const c of mins) out.set(c.id, { min: c.program.minAttendancePct, byPerson: new Map() });
  for (const r of rows) {
    out.get(r.cohortId)?.byPerson.set(r.personId, {
      ...summaryFromCounts(Number(r.held), Number(r.attended), Number(r.excused)),
      enrollmentStatus: r.enrollmentStatus,
    });
  }
  return out;
}
