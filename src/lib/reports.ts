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
