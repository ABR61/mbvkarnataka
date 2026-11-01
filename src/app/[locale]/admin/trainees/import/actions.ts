"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { writeAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import { GENDERS, parseDateOfBirth } from "@/lib/validation/person";
import type { Gender } from "@prisma/client";
import type { ImportState, ImportRowResult } from "@/lib/import";

const emailOk = (e: string) => z.email().safeParse(e).success;

type ParsedRow = ImportRowResult & {
  data: {
    firstName: string;
    lastName: string | null;
    gender: Gender | null;
    dateOfBirth: Date | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    districtId: string | null;
  };
};

export async function importTrainees(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission("trainee.manage");
  // Branch admins may only import into their own district (same rule as the
  // single-trainee form). Super admins (scope = null) can use any district.
  const scope = scopedDistrictId(session);
  const mode = formData.get("mode") === "commit" ? "commit" : "preview";
  const csv = ((formData.get("csv") as string) ?? "").trim();
  if (!csv) return { error: "empty" };

  const { rows } = parseCsv(csv);
  if (rows.length === 0) return { error: "noRows" };

  const districts = await prisma.district.findMany({
    select: { id: true, code: true },
  });
  const codeToId = new Map(
    districts.filter((d) => d.code).map((d) => [d.code!.toUpperCase(), d.id]),
  );

  const parsed: ParsedRow[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const firstName = (row.firstName ?? "").trim();
    if (!firstName) errors.push("firstName_required");

    const genderRaw = (row.gender ?? "").trim().toUpperCase();
    if (genderRaw && !(GENDERS as readonly string[]).includes(genderRaw)) {
      errors.push("gender_invalid");
    }

    const dob = parseDateOfBirth((row.dateOfBirth ?? "").trim());
    if (dob.error) errors.push(`dob_${dob.error}`);

    const email = (row.email ?? "").trim();
    if (email && !emailOk(email)) errors.push("email_invalid");

    const districtCode = (row.districtCode ?? "").trim().toUpperCase();
    let districtId: string | null = null;
    if (districtCode) {
      districtId = codeToId.get(districtCode) ?? null;
      if (!districtId) errors.push("district_unknown");
      else if (scope && districtId !== scope) errors.push("district_outOfScope");
    }
    // A branch admin's rows always land in their district.
    if (scope) districtId = scope;

    const lastName = (row.lastName ?? "").trim();
    return {
      line: idx + 2,
      label: [firstName, lastName].filter(Boolean).join(" ") || `(row ${idx + 2})`,
      ok: errors.length === 0,
      errors,
      data: {
        firstName,
        lastName: lastName || null,
        gender: genderRaw ? (genderRaw as Gender) : null,
        dateOfBirth: dob.date,
        phone: (row.phone ?? "").trim() || null,
        email: email || null,
        address: (row.address ?? "").trim() || null,
        districtId,
      },
    };
  });

  const validCount = parsed.filter((r) => r.ok).length;
  const rowResults: ImportRowResult[] = parsed.map(
    ({ line, label, ok, errors }) => ({ line, label, ok, errors }),
  );

  if (mode === "preview") {
    return { ran: "preview", total: parsed.length, validCount, rows: rowResults };
  }

  // Commit: insert only valid rows, each with a DPDP consent record.
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;

  let committed = 0;
  for (const r of parsed) {
    if (!r.ok) continue;
    // Person + consent together, so a trainee is never stored without consent.
    await prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { kind: "TRAINEE", ...r.data },
      });
      await tx.consentRecord.create({
        data: {
          personId: person.id,
          consentType: "data_processing",
          version: "v1-bulk",
          ipAddress: ip,
        },
      });
    });
    committed++;
  }
  await writeAudit(session.user.id, "create", "Person", undefined, {
    import: "trainees",
    committed,
  });

  revalidatePath(`/${locale}/admin/trainees`);
  return {
    ran: "commit",
    total: parsed.length,
    validCount,
    committed,
    rows: rowResults,
  };
}
