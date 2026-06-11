import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Append an audit-log entry for a sensitive mutation (DPDP/operational traceability).
 * Call from every create/update/delete server action.
 */
export async function writeAudit(
  userId: string | undefined,
  action: "create" | "update" | "delete",
  entity: string,
  entityId?: string,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: userId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      metadata,
    },
  });
}
