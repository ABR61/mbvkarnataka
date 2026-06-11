"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { writeAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/csv";
import type { ImportState, ImportRowResult } from "@/lib/import";

const emailOk = (e: string) => z.email().safeParse(e).success;

type ParsedRow = ImportRowResult & {
  data?: {
    email: string;
    name: string;
    password: string;
    locale: string;
    roleIds: string[];
  };
};

export async function importStaff(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const locale = (formData.get("locale") as string) || "en";
  const session = await requirePermission("user.manage");
  const mode = formData.get("mode") === "commit" ? "commit" : "preview";
  const csv = ((formData.get("csv") as string) ?? "").trim();
  if (!csv) return { error: "empty" };

  const { rows } = parseCsv(csv);
  if (rows.length === 0) return { error: "noRows" };

  const roles = await prisma.role.findMany({ select: { id: true, name: true } });
  const roleByName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));
  const existingEmails = new Set(
    (await prisma.user.findMany({ select: { email: true } })).map((u) =>
      (u.email ?? "").toLowerCase(),
    ),
  );
  const batchEmails = new Set<string>();

  const parsed: ParsedRow[] = rows.map((row, idx) => {
    const errors: string[] = [];
    const name = (row.name ?? "").trim();
    const email = (row.email ?? "").trim();
    const password = (row.password ?? "").trim();
    const localeRaw = (row.locale ?? "").trim().toLowerCase() || "en";

    if (!name) errors.push("name_required");
    if (!email || !emailOk(email)) {
      errors.push("email_invalid");
    } else {
      const lc = email.toLowerCase();
      if (existingEmails.has(lc)) errors.push("email_taken");
      else if (batchEmails.has(lc)) errors.push("email_dup");
    }
    if (password.length < 8) errors.push("password_short");
    if (localeRaw !== "en" && localeRaw !== "kn") errors.push("locale_invalid");

    const roleIds: string[] = [];
    for (const rn of (row.roles ?? "").split(";").map((s) => s.trim()).filter(Boolean)) {
      const id = roleByName.get(rn.toLowerCase());
      if (id) roleIds.push(id);
      else errors.push("role_unknown");
    }

    const ok = errors.length === 0;
    if (ok) batchEmails.add(email.toLowerCase());
    return {
      line: idx + 2,
      label: name || email || `(row ${idx + 2})`,
      ok,
      errors,
      data: ok ? { email, name, password, locale: localeRaw, roleIds } : undefined,
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
    if (!r.ok || !r.data) continue;
    const passwordHash = await bcrypt.hash(r.data.password, 10);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: r.data!.email,
          name: r.data!.name,
          passwordHash,
          locale: r.data!.locale,
        },
      });
      if (r.data!.roleIds.length) {
        await tx.userRole.createMany({
          data: r.data!.roleIds.map((roleId) => ({ userId: user.id, roleId })),
        });
      }
    });
    committed++;
  }
  await writeAudit(session.user.id, "create", "User", undefined, {
    import: "staff",
    committed,
  });

  revalidatePath(`/${locale}/admin/users`);
  return {
    ran: "commit",
    total: parsed.length,
    validCount,
    committed,
    rows: rowResults,
  };
}
