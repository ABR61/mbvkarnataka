import { localized } from "@/lib/localized";
import type { Prisma } from "@prisma/client";

// A completion can point at a main training Program or an announced FutureProgram.
// In forms we carry both as one namespaced string so a single <select> works.
export type ProgramRef =
  | { kind: "training"; id: string }
  | { kind: "future"; id: string };

/** Parse a `training:<id>` / `future:<id>` select value. Null if malformed. */
export function parseProgramRef(value: string | null | undefined): ProgramRef | null {
  const [kind, id] = String(value ?? "").split(":");
  if (!id) return null;
  if (kind === "training") return { kind: "training", id };
  if (kind === "future") return { kind: "future", id };
  return null;
}

type CompletionWithPrograms = Prisma.CompletionGetPayload<{
  include: { program: true; futureProgram: true };
}>;

/** Human label for whichever program a completion points at. */
export function completionProgramName(
  c: CompletionWithPrograms,
  locale: string,
): string {
  if (c.program) return localized(c.program.name, locale);
  if (c.futureProgram) return c.futureProgram.title;
  return "—";
}
