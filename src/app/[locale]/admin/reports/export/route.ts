import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth-guards";
import { districtReport } from "@/lib/reports";
import { localized } from "@/lib/localized";
import { toCsv } from "@/lib/csv";

// CSV export of the district-wise report (gate report.view).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  await requirePermission("report.view");

  const rows = await districtReport();
  const header = [
    "District",
    "Centers",
    "Cohorts",
    "Enrolled",
    "Completed",
    "Certificates",
  ];
  const body = rows.map((r) => [
    localized(r.name, locale),
    String(r.centers),
    String(r.cohorts),
    String(r.enrolled),
    String(r.completed),
    String(r.certificates),
  ]);

  // Prepend a BOM so Excel reads UTF-8 (Kannada names) correctly.
  const csv = "﻿" + toCsv([header, ...body]);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="mbv-district-report.csv"',
    },
  });
}
