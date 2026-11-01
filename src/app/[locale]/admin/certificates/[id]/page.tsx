import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { localized } from "@/lib/localized";
import { PrintButton } from "@/components/admin/print-button";
import { qrSvg } from "@/lib/qr";
import { SITE_URL } from "@/lib/site";
import { formatDate } from "@/lib/dates";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("cohort.manage");

  const cert = await prisma.certificate.findUnique({ where: { id } });
  if (!cert) notFound();

  const t = await getTranslations("Certificates");
  const issued = formatDate(cert.issuedAt, locale);

  const verifyUrl = `${SITE_URL}/${locale}/verify/${cert.verifyCode}`;
  const qr = await qrSvg(verifyUrl);

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <article className="w-full max-w-2xl rounded-lg border-4 border-emerald-700 px-10 py-12 text-center">
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
        {cert.centerName != null && (
          <p className="mt-1 text-sm text-gray-500">
            {localized(cert.centerName, locale)}
          </p>
        )}

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

      <div className="print:hidden">
        <PrintButton label={t("print")} />
      </div>
    </div>
  );
}
