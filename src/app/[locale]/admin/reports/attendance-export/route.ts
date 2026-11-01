import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guards";
import { attendanceReport } from "@/lib/attendance";
import { isBelowMinimum } from "@/lib/attendance-rules";
import { localized } from "@/lib/localized";
import { toCsv } from "@/lib/csv";

// Per-trainee attendance CSV (gate report.view) — for funders and audits.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  await requirePermission("report.view");

  const { trainees } = await attendanceReport();
  const header = [
    "Trainee",
    "Phone",
    "Program",
    "Cohort",
    "Center",
    "District",
    "Enrollment status",
    "Sessions held",
    "Attended",
    "Excused",
    "Absent",
    "Attendance %",
    "Minimum %",
    "Below minimum",
  ];
  const body = trainees.map((r) => [
    r.person,
    r.phone ?? "",
    localized(r.program, locale),
    r.cohortCode ?? "",
    localized(r.center, locale),
    localized(r.district, locale),
    r.enrollmentStatus,
    String(r.summary.held),
    String(r.summary.attended),
    String(r.summary.excused),
    String(r.summary.absent),
    r.summary.pct === null ? "" : String(r.summary.pct),
    String(r.min),
    isBelowMinimum(r.summary.pct, r.min) ? "YES" : "",
  ]);

  // Prepend a BOM so Excel reads UTF-8 (Kannada names) correctly.
  const csv = "﻿" + toCsv([header, ...body]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mbv-attendance-report.csv"',
    },
  });
}
