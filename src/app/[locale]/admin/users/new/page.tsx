import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { UserForm } from "../user-form";
import { createUser } from "../actions";

export default async function NewUserPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requirePermission("user.manage");

  const [roles, districts] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    districtOptions(locale),
  ]);
  const t = await getTranslations("Users");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("newTitle")}</h1>
      <UserForm
        locale={locale}
        mode="create"
        roles={roles}
        districts={districts}
        action={createUser}
      />
    </div>
  );
}
