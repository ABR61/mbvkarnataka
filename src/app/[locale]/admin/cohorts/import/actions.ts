"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import type { ImportState, ImportRowResult } from "@/lib/import";

type ParsedRow = ImportRowResult & {
  data: { personId: string | null; cohortId: string | null };
};

export async function importEnrollments(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission("cohort.manage");
  const mode = formData.get("mode") === "commit" ? "commit" : "preview";
  const csv = ((formData.get("csv") as string) ?? "").trim();
  if (!csv) return { error: "empty" };

  const { rows } = parseCsv(csv);
  if (rows.length === 0) return { error: "noRows" };

  const cohorts = await prisma.cohort.findMany({
    select: {
      id: true,
      code: true,
      capacity: true,
      _count: { select: { enrollments: true } },
    },
  });
  const cohortByCode = new Map(
    cohorts.filter((c) => c.code).map((c) => [c.code!.toUpperCase(), c]),
  );

  const trainees = await prisma.person.findMany({
    where: { kind: "TRAINEE", phone: { not: null } },
    select: { id: true, phone: true },
  });
  const byPhone = new Map<string, string[]>();
  for (const tr of trainees) {
    const p = (tr.phone ?? "").trim();
    if (!p) continue;
    const list = byPhone.get(p);
    if (list) list.push(tr.id);
    else byPhone.set(p, [tr.id]);
  }

  const existing = await prisma.enrollment.findMany({
    select: { personId: true, cohortId: true },
  });
  const enrolled = new Set(existing.map((e) => `${e.personId}:${e.cohortId}`));
  const reserved = new Map<string, number>(); // cohortId -> slots reserved this batch

  const parsed: ParsedRow[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const code = (row.cohortCode ?? "").trim().toUpperCase();
    const phone = (row.traineePhone ?? "").trim();

    const cohort = code ? cohortByCode.get(code) : undefined;
    if (!code) errors.push("cohort_required");
    else if (!cohort) errors.push("cohort_unknown");

    let personId: string | null = null;
    if (!phone) {
      errors.push("phone_required");
    } else {
      const ids = byPhone.get(phone) ?? [];
      if (ids.length === 0) errors.push("trainee_notfound");
      else if (ids.length > 1) errors.push("trainee_ambiguous");
      else personId = ids[0];
    }

    if (cohort && personId) {
      const key = `${personId}:${cohort.id}`;
      if (enrolled.has(key)) {
        errors.push("already_enrolled");
      } else {
        const used = reserved.get(cohort.id) ?? 0;
        if (
          cohort.capacity != null &&
          cohort._count.enrollments + used >= cohort.capacity
        ) {
          errors.push("cohort_full");
        } else if (errors.length === 0) {
          // Reserve the slot so later rows see capacity/duplicate consistently.
          reserved.set(cohort.id, used + 1);
          enrolled.add(key);
        }
      }
    }

    return {
      line: idx + 2,
      label: `${phone || "?"} → ${code || "?"}`,
      ok: errors.length === 0,
      errors,
      data: { personId, cohortId: cohort?.id ?? null },
    };
  });

  const validCount = parsed.filter((r) => r.ok).length;
  const rowResults: ImportRowResult[] = parsed.map(
    ({ line, label, ok, errors }) => ({ line, label, ok, errors }),
  );

  if (mode === "preview") {
    return { ran: "preview", total: parsed.length, validCount, rows: rowResults };
  }

  let committed = 0;
  for (const r of parsed) {
    if (!r.ok || !r.data.personId || !r.data.cohortId) continue;
    await prisma.enrollment.create({
      data: { personId: r.data.personId, cohortId: r.data.cohortId },
    });
    committed++;
  }
  await writeAudit(session.user.id, "create", "Enrollment", undefined, {
    import: "enrollments",
    committed,
  });

  revalidatePath(`/${locale}/admin/cohorts`);
  return {
    ran: "commit",
    total: parsed.length,
    validCount,
    committed,
    rows: rowResults,
  };
}
