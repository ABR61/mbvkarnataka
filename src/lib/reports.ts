import "server-only";
import { prisma } from "@/lib/prisma";

export type DistrictReportRow = {
  id: string;
  name: unknown; // { en, kn } JSON
  centers: number;
  cohorts: number;
  enrolled: number;
  completed: number;
  certificates: number;
};

type RawRow = {
  id: string;
  name: unknown;
  centers: bigint;
  cohorts: bigint;
  enrolled: bigint;
  completed: bigint;
  certificates: bigint;
};

/**
 * District-wise rollup (training happens at a center, which belongs to a
 * district). One efficient aggregate query; COUNT(DISTINCT …) avoids the
 * fan-out double-counting that the chained LEFT JOINs would otherwise cause.
 */
export async function districtReport(): Promise<DistrictReportRow[]> {
  const rows = await prisma.$queryRaw<RawRow[]>`
    SELECT d.id,
           d.name,
           COUNT(DISTINCT ce.id) AS centers,
           COUNT(DISTINCT co.id) AS cohorts,
           COUNT(DISTINCT e.id)  AS enrolled,
           COUNT(DISTINCT e.id) FILTER (WHERE e.status = 'COMPLETED') AS completed,
           COUNT(DISTINCT cert.id) AS certificates
    FROM "District" d
    LEFT JOIN "Center" ce      ON ce."districtId" = d.id
    LEFT JOIN "Cohort" co      ON co."centerId" = ce.id
    LEFT JOIN "Enrollment" e   ON e."cohortId" = co.id
    LEFT JOIN "Certificate" cert ON cert."enrollmentId" = e.id
    GROUP BY d.id, d.name
    ORDER BY d.name->>'en'
  `;
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    centers: Number(r.centers),
    cohorts: Number(r.cohorts),
    enrolled: Number(r.enrolled),
    completed: Number(r.completed),
    certificates: Number(r.certificates),
  }));
}

export type PlacementSummary = {
  total: number;
  distinctTrainees: number;
  completedEnrollments: number;
  placementRate: number; // distinctTrainees / completedEnrollments, 0..1
  avgMonthlySalary: number | null;
  byStatus: { PLACED: number; ACTIVE: number; EXITED: number };
  retention: number | null; // share of followed-up placements still employed, 0..1
};

/**
 * Placement & M&E rollup. Placement rate = distinct placed trainees over
 * completed enrollments. Retention is computed from the LATEST follow-up of
 * each placement that has one (DISTINCT ON … ORDER BY date DESC).
 */
export async function placementSummary(): Promise<PlacementSummary> {
  const [total, distinct, completedEnrollments, salaryAgg, statusRows, retentionRows] =
    await Promise.all([
      prisma.placement.count(),
      prisma.placement.findMany({ distinct: ["personId"], select: { personId: true } }),
      prisma.enrollment.count({ where: { status: "COMPLETED" } }),
      prisma.placement.aggregate({ _avg: { monthlySalary: true } }),
      prisma.placement.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.$queryRaw<{ still: bigint; n: bigint }[]>`
        SELECT COUNT(*) FILTER (WHERE latest."stillEmployed") AS still,
               COUNT(*) AS n
        FROM (
          SELECT DISTINCT ON ("placementId") "placementId", "stillEmployed"
          FROM "FollowUp"
          ORDER BY "placementId", "followUpOn" DESC
        ) latest
      `,
    ]);

  const byStatus = { PLACED: 0, ACTIVE: 0, EXITED: 0 };
  for (const r of statusRows) byStatus[r.status] = r._count._all;

  const followed = Number(retentionRows[0]?.n ?? 0);
  const stillEmployed = Number(retentionRows[0]?.still ?? 0);

  return {
    total,
    distinctTrainees: distinct.length,
    completedEnrollments,
    placementRate: completedEnrollments > 0 ? distinct.length / completedEnrollments : 0,
    avgMonthlySalary:
      salaryAgg._avg.monthlySalary != null ? Number(salaryAgg._avg.monthlySalary) : null,
    byStatus,
    retention: followed > 0 ? stillEmployed / followed : null,
  };
}

export async function orgSummary() {
  const [
    districts,
    centers,
    programs,
    activeCohorts,
    trainees,
    certificates,
    pendingApplications,
  ] = await Promise.all([
    prisma.district.count(),
    prisma.center.count(),
    prisma.program.count({ where: { status: "active" } }),
    prisma.cohort.count({ where: { status: "ACTIVE" } }),
    prisma.person.count({ where: { kind: "TRAINEE" } }),
    prisma.certificate.count(),
    prisma.application.count({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } },
    }),
  ]);
  return {
    districts,
    centers,
    programs,
    activeCohorts,
    trainees,
    certificates,
    pendingApplications,
  };
}
