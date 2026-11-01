import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";
import { Link } from "@/i18n/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { qrSvg } from "@/lib/qr";
import { SITE_URL } from "@/lib/site";
import { formatDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function PortalCertificatePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await auth(); // layout enforces auth

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) notFound();

  // A participant may only view their own certificate.
  const person = await prisma.person.findUnique({
    where: { userId: session!.user.id },
    select: { id: true },
  });
  if (!person || cert.personId !== person.id) notFound();

  const t = await getTranslations("Certificates");
  const tp = await getTranslations("PortalFeedback");
  const issued = formatDate(cert.issuedAt, locale);

  // A scannable link to the public verification page, embedded on the cert so a
  // printed copy can be verified by anyone (employer, funder) with a phone.
  const verifyUrl = `${SITE_URL}/${locale}/verify/${cert.verifyCode}`;
  const qr = await qrSvg(verifyUrl);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <article className="w-full max-w-2xl rounded-lg border-4 border-emerald-700 bg-white px-10 py-12 text-center dark:bg-gray-950">
        <div className="text-sm font-semibold uppercase tracking-widest text-emerald-700">
          Manava Bandhutva Vedike
        </div>
        <h1 className="mt-6 text-3xl font-bold">{t("certTitle")}</h1>
        <p className="mt-6 text-gray-600 dark:text-gray-300">{t("certifies")}</p>
        <p className="mt-2 text-2xl font-semibold">{cert.personName}</p>
        <p className="mt-4 text-gray-600 dark:text-gray-300">{t("hasCompleted")}</p>
        <p className="mt-1 text-xl font-medium text-emerald-700">
          {localized(cert.programName, locale)}
        </p>

        <div className="mt-10 flex items-center justify-between text-xs text-gray-500">
          <span>
            {t("serial")}: <strong>{cert.serialNumber}</strong>
          </span>
          <span>
            {t("issued")}: {issued}
          </span>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <div className="h-28 w-28" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="text-xs text-gray-400">{t("scanToVerify")}</p>
          <p className="break-all text-[10px] text-gray-400">{verifyUrl}</p>
        </div>
      </article>

      <div className="flex items-center gap-4 print:hidden">
        <PrintButton label={t("print")} />
        <Link
          href="/portal/feedback"
          className="text-sm text-gray-500 hover:underline"
        >
          {tp("back")}
        </Link>
      </div>
    </div>
  );
}
