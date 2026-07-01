import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { districtOptions } from "@/lib/options";
import { completionProgramName } from "@/lib/program-ref";
import { FutureProgramForm } from "@/app/[locale]/admin/future-programs/future-program-form";
import { createFutureProgram } from "@/app/[locale]/admin/future-programs/actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "HomePage" });
  return { title: t("futureTitle") };
}

export default async function FutureProgramsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");
  const tf = await getTranslations("FuturePrograms");

  const session = await auth();
  const canPlan = session?.user?.permissions?.includes("program.plan") ?? false;
  const scope = session?.user?.districtId ?? null;

  // Planners (super/branch admin) get the form; branch admins are fixed to
  // their district, a super admin picks one.
  let planForm: ReactNode = null;
  if (canPlan) {
    const fixed = scope
      ? await prisma.district.findUnique({ where: { id: scope } })
      : null;
    const districts = scope ? undefined : await districtOptions(locale);
    planForm = (
      <section className="mb-16 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-8">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold">{tf("newTitle")}</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300">{tf("newIntro")}</p>
        </div>
        <div className="mx-auto max-w-xl">
          <FutureProgramForm
            locale={locale}
            action={createFutureProgram}
            districts={districts}
            fixedDistrictName={fixed ? localized(fixed.name, locale) : undefined}
          />
        </div>
      </section>
    );
  }

  // Everyone sees the list of approved future programs — the same photos &
  // descriptions the public sees — so planners preview the live view too.
  const programs = await prisma.futureProgram.findMany({
    where: { approved: true },
    include: { district: true },
    orderBy: { createdAt: "desc" },
  });

  // Approved participant feedback — shown as testimonials for programs people
  // have completed. Covers both future programs and main training programs.
  const approvedFeedback = await prisma.feedback.findMany({
    where: { approved: true },
    include: {
      completion: { include: { user: true, program: true, futureProgram: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const firstName = (u: { name: string | null; email: string | null }) =>
    (u.name ?? u.email ?? "").split(" ")[0] || "—";
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

  // Feedback grouped by the future program it belongs to (for the per-card rating).
  const fbByFuture = new Map<string, { rating: number; comment: string | null; who: string }[]>();
  for (const f of approvedFeedback) {
    const fid = f.completion.futureProgramId;
    if (!fid) continue;
    const arr = fbByFuture.get(fid) ?? [];
    arr.push({ rating: f.rating, comment: f.comment, who: firstName(f.completion.user) });
    fbByFuture.set(fid, arr);
  }
  const avg = (arr: { rating: number }[]) =>
    Math.round(arr.reduce((s, f) => s + f.rating, 0) / arr.length);

  const detail = (label: string, value: string) => (
    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
      <span className="font-medium text-gray-800 dark:text-gray-100">{label}: </span>
      {value}
    </p>
  );

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-16">
      {planForm}

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold">{t("futureTitle")}</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{t("futureSubtitle")}</p>
      </div>

      {programs.length === 0 ? (
        <p className="text-center text-gray-500">{t("futureEmpty")}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {programs.map((p) => (
            <li
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 transition duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-gray-800"
            >
              {p.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt=""
                  className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              <div className="flex flex-1 flex-col p-6">
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                {localized(p.district.name, locale)}
              </span>
              <h2 className="mt-1 text-lg font-bold">{p.title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">
                {p.description}
              </p>
              {p.objectives && detail(tf("objectives"), p.objectives)}
              {p.resources && detail(tf("resources"), p.resources)}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {p.durationWeeks != null && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {tf("duration")}: {p.durationWeeks} {tf(p.durationUnit ?? "weeks")}
                  </span>
                )}
                {p.seats != null && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {tf("capacity")}: {p.seats}
                  </span>
                )}
              </div>
              {(() => {
                const fb = fbByFuture.get(p.id);
                if (!fb?.length) return null;
                return (
                  <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
                    <p className="text-sm">
                      <span className="whitespace-nowrap text-amber-500">
                        {stars(avg(fb))}
                      </span>{" "}
                      <span className="text-gray-500">
                        {tf("ratingCount", { count: fb.length })}
                      </span>
                    </p>
                    {fb[0].comment && (
                      <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-300">
                        “{fb[0].comment}” — {fb[0].who}
                      </p>
                    )}
                  </div>
                );
              })()}
              <a
                href={`/${locale}/apply?future=${p.id}`}
                className="mt-5 inline-block self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {tf("applyNow")}
              </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      {approvedFeedback.length > 0 && (
        <section className="mt-20">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold">{tf("testimonialsTitle")}</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              {tf("testimonialsIntro")}
            </p>
          </div>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {approvedFeedback.map((f) => (
              <li
                key={f.id}
                className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
              >
                <p className="whitespace-nowrap text-amber-500">{stars(f.rating)}</p>
                {f.comment && (
                  <p className="mt-2 text-gray-700 dark:text-gray-200">“{f.comment}”</p>
                )}
                <p className="mt-3 text-sm text-gray-500">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {firstName(f.completion.user)}
                  </span>{" "}
                  · {completionProgramName(f.completion, locale)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
