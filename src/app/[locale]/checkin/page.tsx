import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { Link } from "@/i18n/navigation";
import { formatDateWithWeekday, formatDateTime } from "@/lib/dates";
import { markingWindow } from "@/lib/attendance-rules";
import { resolveTicket } from "@/lib/checkin-token";
import { CheckinConfirm } from "./checkin-confirm";
import { selfCheckIn } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Checkin" });
  return { title: t("title"), robots: { index: false } };
}

// Where a trainee lands after scanning the session QR. A fresh QR token is
// exchanged for a short-lived ticket so there's time to sign in and confirm.
export default async function CheckinPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ s?: string; t?: string; k?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { s: sessionId = "", t: qr = "", k } = await searchParams;
  const tr = await getTranslations("Checkin");
  const tp = await getTranslations("Portal");

  const ticket = resolveTicket(sessionId, qr, k);

  const shell = (title: string, body: string, tone: "ok" | "warn" = "warn") => (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="text-4xl" aria-hidden>
        {tone === "ok" ? "✓" : "⏱"}
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-gray-700 dark:text-gray-300">{body}</p>
      <Link href="/portal" className="mt-2 font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        {tp("myPortal")} →
      </Link>
    </main>
  );

  if (!ticket) return shell(tr("expiredTitle"), tr("expiredBody"));

  const session = await auth();
  if (!session?.user) {
    const back = `/${locale}/checkin?s=${encodeURIComponent(sessionId)}&k=${encodeURIComponent(ticket)}`;
    redirect(`/${locale}/sign-in?callbackUrl=${encodeURIComponent(back)}`);
  }

  const [person, ts] = await Promise.all([
    prisma.person.findUnique({ where: { userId: session.user.id }, select: { id: true, firstName: true } }),
    prisma.trainingSession.findUnique({
      where: { id: sessionId },
      include: { course: true, cohort: { include: { center: true } } },
    }),
  ]);
  if (!ts) return shell(tr("expiredTitle"), tr("expiredBody"));
  if (ts.status === "CANCELLED" || markingWindow(ts.sessionDate) !== "open") {
    return shell(tr("closedTitle"), tr("closedBody"));
  }
  const enrolled = person
    ? await prisma.enrollment.findFirst({
        where: { cohortId: ts.cohortId, personId: person.id, status: { not: "DROPPED" } },
        select: { id: true },
      })
    : null;
  if (!person || !enrolled) return shell(tr("notEnrolledTitle"), tr("notEnrolledBody"));

  const existing = await prisma.attendance.findUnique({
    where: { sessionId_personId: { sessionId, personId: person.id } },
    select: { status: true, selfCheckedInAt: true },
  });
  if (existing?.selfCheckedInAt) {
    return shell(tr("alreadyTitle"), tr("alreadyBody", { at: formatDateTime(existing.selfCheckedInAt, locale) }), "ok");
  }
  if (existing) {
    const ta = await getTranslations("Attendance");
    return shell(tr("alreadyMarkedTitle"), tr("alreadyMarkedBody", { status: ta(`status_${existing.status}`) }), "ok");
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-4 py-12">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-emerald-700">{tr("title")}</p>
        <h1 className="mt-2 text-2xl font-bold">{tr("hello", { name: person.firstName })}</h1>
      </div>
      <dl className="rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-800">
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-gray-600 dark:text-gray-400">{tr("course")}</dt>
          <dd className="text-right font-medium">{localized(ts.course.name, locale)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-gray-600 dark:text-gray-400">{tr("center")}</dt>
          <dd className="text-right font-medium">{localized(ts.cohort.center.name, locale)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-1">
          <dt className="text-gray-600 dark:text-gray-400">{tr("date")}</dt>
          <dd className="text-right font-medium">
            {formatDateWithWeekday(ts.sessionDate, locale)}
            {ts.startTime ? ` ${ts.startTime}` : ""}
          </dd>
        </div>
      </dl>
      <CheckinConfirm locale={locale} sessionId={sessionId} ticket={ticket} action={selfCheckIn} />
    </main>
  );
}
