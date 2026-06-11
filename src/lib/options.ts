import "server-only";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

/** Localized, alphabetically-sorted district options for select inputs. */
export async function districtOptions(locale: string) {
  const districts = await prisma.district.findMany();
  return districts
    .map((d) => ({ id: d.id, name: localized(d.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
