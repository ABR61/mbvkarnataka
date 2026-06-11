import "server-only";
import type { PersonKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

export type Option = { id: string; name: string };

const byName = (a: Option, b: Option) => a.name.localeCompare(b.name);

/** Localized, alphabetically-sorted district options for select inputs. */
export async function districtOptions(locale: string): Promise<Option[]> {
  const districts = await prisma.district.findMany();
  return districts
    .map((d) => ({ id: d.id, name: localized(d.name, locale) }))
    .sort(byName);
}

export async function programOptions(locale: string): Promise<Option[]> {
  const programs = await prisma.program.findMany();
  return programs
    .map((p) => ({ id: p.id, name: localized(p.name, locale) }))
    .sort(byName);
}

export async function centerOptions(locale: string): Promise<Option[]> {
  const centers = await prisma.center.findMany();
  return centers
    .map((c) => ({ id: c.id, name: localized(c.name, locale) }))
    .sort(byName);
}

const personName = (p: { firstName: string; lastName: string | null }) =>
  [p.firstName, p.lastName].filter(Boolean).join(" ");

/** People of a given kind as { id, name } options. */
export async function personOptions(kinds: PersonKind[]): Promise<Option[]> {
  const people = await prisma.person.findMany({
    where: { kind: { in: kinds } },
    select: { id: true, firstName: true, lastName: true },
  });
  return people.map((p) => ({ id: p.id, name: personName(p) })).sort(byName);
}
