import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { districtOptions } from "@/lib/options";
import { ApplyForm } from "./apply-form";

// Reads the DB (programs/districts) → render per-request.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Apply" });
  return { title: t("title"), description: t("intro") };
}

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ program?: string; future?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const sp = await searchParams;

  const [programsRaw, districts] = await Promise.all([
    prisma.program.findMany({ where: { status: "active" } }),
    districtOptions(locale),
  ]);
  const programs = programsRaw
    .map((p) => ({ id: p.id, name: localized(p.name, locale) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Applying to a specific announced future program (from its "Apply now" button).
  const futureProgram = sp.future
    ? await prisma.futureProgram.findFirst({
        where: { id: sp.future, approved: true },
        select: { id: true, title: true },
      })
    : null;

  const t = await getTranslations("Apply");
  const defaultProgramId = programs.some((p) => p.id === sp.program)
    ? (sp.program ?? "")
    : "";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-300">{t("intro")}</p>

      <div className="mt-8">
        <ApplyForm
          programs={programs}
          districts={districts}
          defaultProgramId={defaultProgramId}
          futureProgram={futureProgram ?? undefined}
        />
      </div>
    </main>
  );
}
