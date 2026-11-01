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

export async function orgSummary(districtId?: string | null) {
  // When districtId is set (branch admin), every count is scoped to that district;
  // when null/undefined (super admin) the counts are platform-wide.
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
    prisma.center.count(districtId ? { where: { districtId } } : undefined),
    prisma.program.count({ where: { status: "active" } }),
    prisma.cohort.count({
      where: {
        status: "ACTIVE",
        ...(districtId ? { center: { districtId } } : {}),
      },
    }),
    prisma.person.count({
      where: { kind: "TRAINEE", ...(districtId ? { districtId } : {}) },
    }),
    prisma.certificate.count(
      districtId ? { where: { person: { districtId } } } : undefined,
    ),
    prisma.application.count({
      where: {
        status: { in: ["SUBMITTED", "UNDER_REVIEW"] },
        ...(districtId ? { districtId } : {}),
      },
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

export type FollowUpProgression = {
  // One row per follow-up checkpoint (3, 6, 12 months since placement).
  periods: {
    periodMonths: number;
    followed: number; // follow-ups recorded at this checkpoint
    stillEmployed: number; // how many were still employed
    retention: number; // stillEmployed / followed, 0..1
    avgIncome: number | null; // avg monthly income reported at this checkpoint
  }[];
  // Income uplift: baseline salary at placement vs the latest follow-up income,
  // over placements that have at least one follow-up (like-for-like).
  baselineAvgSalary: number | null;
  latestAvgIncome: number | null;
};

/**
 * Longitudinal M&E: how placed trainees fare over time. Aggregates FollowUp
 * records by checkpoint and computes income uplift from placement to the most
 * recent follow-up. This is the data funders look for to see lasting impact.
 */
export async function followUpProgression(): Promise<FollowUpProgression> {
  const [periodRows, baselineRow, latestRow] = await Promise.all([
    prisma.$queryRaw<
      { period: number; followed: bigint; still: bigint; avg_income: unknown }[]
    >`
      SELECT "periodMonths" AS period,
             COUNT(*) AS followed,
             COUNT(*) FILTER (WHERE "stillEmployed") AS still,
             AVG("monthlyIncome") AS avg_income
      FROM "FollowUp"
      WHERE "periodMonths" IS NOT NULL
      GROUP BY "periodMonths"
      ORDER BY "periodMonths"
    `,
    prisma.$queryRaw<{ avg_salary: unknown }[]>`
      SELECT AVG(p."monthlySalary") AS avg_salary
      FROM "Placement" p
      WHERE EXISTS (SELECT 1 FROM "FollowUp" f WHERE f."placementId" = p.id)
    `,
    prisma.$queryRaw<{ avg_income: unknown }[]>`
      SELECT AVG(latest."monthlyIncome") AS avg_income
      FROM (
        SELECT DISTINCT ON ("placementId") "monthlyIncome"
        FROM "FollowUp"
        WHERE "monthlyIncome" IS NOT NULL
        ORDER BY "placementId", "followUpOn" DESC
      ) latest
    `,
  ]);

  const num = (v: unknown): number | null => (v == null ? null : Number(v));

  return {
    periods: periodRows.map((r) => {
      const followed = Number(r.followed);
      const stillEmployed = Number(r.still);
      return {
        periodMonths: Number(r.period),
        followed,
        stillEmployed,
        retention: followed > 0 ? stillEmployed / followed : 0,
        avgIncome: num(r.avg_income),
      };
    }),
    baselineAvgSalary: num(baselineRow[0]?.avg_salary),
    latestAvgIncome: num(latestRow[0]?.avg_income),
  };
}
