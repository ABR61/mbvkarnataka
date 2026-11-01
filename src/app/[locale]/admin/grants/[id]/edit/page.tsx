import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { DeleteButton } from "@/components/admin/delete-button";
import { GrantForm } from "../../grant-form";
import { updateGrant, deleteGrant } from "../../actions";

export default async function EditGrantPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const grant = await prisma.grant.findUnique({ where: { id } });
  if (!grant) notFound();

  const t = await getTranslations("Grants");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <GrantForm
        locale={locale}
        action={updateGrant}
        defaults={{
          id: grant.id,
          funder: grant.funder,
          amount: grant.amount.toString(),
          reference: grant.reference ?? "",
          receivedOn: grant.receivedOn.toISOString().slice(0, 10),
          purpose: grant.purpose ?? "",
          restricted: grant.restricted,
          foreignSource: grant.foreignSource,
          note: grant.note ?? "",
        }}
      />

      <div className="max-w-md border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteGrant}
          id={grant.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
