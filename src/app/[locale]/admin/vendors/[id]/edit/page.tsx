import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { DeleteButton } from "@/components/admin/delete-button";
import { VendorForm } from "../../vendor-form";
import { updateVendor, deleteVendor } from "../../actions";

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  await requirePermission("finance.manage");

  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) notFound();

  const t = await getTranslations("Vendors");
  const tc = await getTranslations("Common");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <VendorForm
        locale={locale}
        action={updateVendor}
        defaults={{
          id: vendor.id,
          name: vendor.name,
          contactPerson: vendor.contactPerson ?? "",
          phone: vendor.phone ?? "",
          email: vendor.email ?? "",
          note: vendor.note ?? "",
        }}
      />

      <div className="max-w-md border-t border-gray-200 pt-4 dark:border-gray-800">
        <DeleteButton
          action={deleteVendor}
          id={vendor.id}
          locale={locale}
          label={tc("delete")}
          confirmText={t("confirmDelete")}
        />
      </div>
    </div>
  );
}
