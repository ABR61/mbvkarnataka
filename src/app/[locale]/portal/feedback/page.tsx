import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { completionProgramName } from "@/lib/program-ref";
import { FeedbackForm } from "./feedback-form";
import { submitFeedback } from "./actions";

export const dynamic = "force-dynamic";

const stars = (n: number) => "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));

export default async function PortalFeedbackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth(); // layout enforces auth
  const t = await getTranslations("PortalFeedback");

  const completions = await prisma.completion.findMany({
    where: { userId: session!.user.id },
    include: { program: true, futureProgram: true, feedback: true, certificate: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
        </div>
        <Link
          href="/portal"
          className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          {t("back")}
        </Link>
      </div>

      {completions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {completions.map((c) => {
            const fb = c.feedback;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-gray-200 p-5 dark:border-gray-800"
              >
                <h2 className="text-lg font-semibold">
                  {completionProgramName(c, locale)}
                </h2>

                {fb?.approved ? (
                  <div className="mt-2">
                    <span className="mr-2 whitespace-nowrap text-amber-500">
                      {stars(fb.rating)}
                    </span>
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {t("published")}
                    </span>
                    {fb.comment && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {fb.comment}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">{t("publishedNote")}</p>
                  </div>
                ) : (
                  <>
                    {fb && (
                      <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                        {t("pending")}
                      </span>
                    )}
                    <FeedbackForm
                      locale={locale}
                      action={submitFeedback}
                      completionId={c.id}
                      currentRating={fb?.rating}
                      currentComment={fb?.comment ?? undefined}
                    />
                  </>
                )}

                {c.certificate && (
                  <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <span className="font-medium text-emerald-800 dark:text-emerald-200">
                      🎓 {t("certificateEarned")}
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-300">
                      {c.certificate.serialNumber}
                    </span>
                    <Link
                      href={`/portal/certificate/${c.certificate.id}`}
                      className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
                    >
                      {t("viewCertificate")}
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
