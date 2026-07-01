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

/**
 * Programs a completion can point at — both main training Programs and announced
 * FuturePrograms — as a single flat option list. Values are namespaced so the
 * server action knows which table to write: `training:<id>` / `future:<id>`.
 * A branch admin's districtId restricts the future programs to their district.
 */
export async function completableProgramOptions(
  locale: string,
  districtId?: string | null,
): Promise<Option[]> {
  const [programs, futures] = await Promise.all([
    prisma.program.findMany({ select: { id: true, name: true } }),
    prisma.futureProgram.findMany({
      where: districtId ? { districtId } : undefined,
      select: { id: true, title: true },
    }),
  ]);
  const training = programs.map((p) => ({
    id: `training:${p.id}`,
    name: localized(p.name, locale),
  }));
  const future = futures.map((f) => ({ id: `future:${f.id}`, name: f.title }));
  return [...training, ...future].sort(byName);
}

/** Student logins (trainees with a User account) as { id: userId, name } options. */
export async function studentUserOptions(): Promise<Option[]> {
  const people = await prisma.person.findMany({
    where: { kind: "TRAINEE", userId: { not: null } },
    select: { userId: true, firstName: true, lastName: true },
  });
  return people
    .map((p) => ({ id: p.userId as string, name: personName(p) }))
    .sort(byName);
}

export async function courseOptions(locale: string): Promise<Option[]> {
  const courses = await prisma.course.findMany({ include: { program: true } });
  return courses
    .map((c) => ({
      id: c.id,
      name: `${localized(c.name, locale)} · ${localized(c.program.name, locale)}`,
    }))
    .sort(byName);
}

export async function venueOptions(locale: string): Promise<Option[]> {
  const venues = await prisma.venue.findMany({ include: { center: true } });
  return venues
    .map((v) => ({ id: v.id, name: `${v.name} · ${localized(v.center.name, locale)}` }))
    .sort(byName);
}

export async function vendorOptions(): Promise<Option[]> {
  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  return vendors.map((v) => ({ id: v.id, name: v.name }));
}

export async function employerOptions(): Promise<Option[]> {
  const employers = await prisma.employer.findMany({ orderBy: { name: "asc" } });
  return employers.map((e) => ({ id: e.id, name: e.name }));
}

export async function cohortOptions(locale: string): Promise<Option[]> {
  const cohorts = await prisma.cohort.findMany({
    include: { program: true, center: true },
  });
  return cohorts
    .map((c) => ({
      id: c.id,
      name:
        c.code ??
        `${localized(c.program.name, locale)} · ${localized(c.center.name, locale)}`,
    }))
    .sort(byName);
}
