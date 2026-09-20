import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { consumeRateLimit } from "@/lib/rate-limit";
import { RATE_LIMITS } from "@/lib/rate-limit-config";
import { getClientIp } from "@/lib/client-ip";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Verify" });
  return { title: t("title") };
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Verify");

  // Per-IP throttle so the public code lookup can't be used to enumerate valid
  // certificate codes at scale.
  const gate = await consumeRateLimit({
    bucket: "verify",
    key: getClientIp(await headers()),
    limit: RATE_LIMITS.verify.limit,
    windowSec: RATE_LIMITS.verify.windowSec,
  });

  const cert = gate.ok
    ? await prisma.certificate.findUnique({ where: { verifyCode: code } })
    : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      {!gate.ok ? (
        <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-8 dark:border-amber-900 dark:bg-amber-950">
          <div className="text-3xl">⏳</div>
          <h1 className="mt-2 text-xl font-bold text-amber-800 dark:text-amber-200">
            {t("rateLimited")}
          </h1>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
            {t("rateLimitedBody")}
          </p>
        </div>
      ) : cert ? (
        <div className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-8 dark:border-emerald-900 dark:bg-emerald-950">
          <div className="text-3xl">✓</div>
          <h1 className="mt-2 text-xl font-bold text-emerald-800 dark:text-emerald-200">
            {t("valid")}
          </h1>
          <dl className="mt-6 flex flex-col gap-2 text-left text-sm">
            <Row label={t("name")} value={cert.personName} />
            <Row label={t("program")} value={localized(cert.programName, locale)} />
            <Row label={t("serial")} value={cert.serialNumber} />
            <Row
              label={t("issued")}
              value={cert.issuedAt.toISOString().slice(0, 10)}
            />
          </dl>
        </div>
      ) : (
        <div className="w-full rounded-xl border border-red-200 bg-red-50 p-8 dark:border-red-900 dark:bg-red-950">
          <div className="text-3xl">✕</div>
          <h1 className="mt-2 text-xl font-bold text-red-700 dark:text-red-300">
            {t("invalid")}
          </h1>
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {t("invalidBody")}
          </p>
        </div>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-t border-emerald-200/60 py-1.5 dark:border-emerald-900/60">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
