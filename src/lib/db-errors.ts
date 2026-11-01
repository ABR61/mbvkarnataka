import { Prisma } from "@prisma/client";

/**
 * True only when `e` is a unique-constraint violation (Prisma P2002) on `field`.
 * Use it to turn a duplicate into a friendly field error without masking every
 * other database failure as "already taken".
 *
 * The violated fields are reported in `meta.target` by the classic query engine,
 * but under `meta.driverAdapterError.cause.constraint.fields` with the pg driver
 * adapter this app uses — both shapes are handled.
 */
export function isUniqueViolationOn(e: unknown, field: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2002") {
    return false;
  }
  const meta = (e.meta ?? {}) as {
    target?: string | string[];
    driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } };
  };
  const fields = [
    ...(Array.isArray(meta.target) ? meta.target : meta.target ? [meta.target] : []),
    ...(meta.driverAdapterError?.cause?.constraint?.fields ?? []),
  ];
  return fields.includes(field);
}
