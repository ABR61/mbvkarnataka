import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requirePermission } from "@/lib/auth-guards";
import { districtOptions } from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { UserForm } from "../../user-form";
import { ResetPasswordForm } from "../../reset-password-form";
import { updateUser, deleteUser } from "../../actions";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("user.manage");

  const user = await prisma.user.findUnique({
    where: { id },
    include: { userRoles: true },
  });
  if (!user) notFound();

  const [roles, districts] = await Promise.all([
    prisma.role.findMany({ orderBy: { name: "asc" } }),
    districtOptions(locale),
  ]);
  const t = await getTranslations("Users");
  const tc = await getTranslations("Common");
  const isSelf = session.user.id === user.id;

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-bold">{t("editTitle")}</h1>

      <UserForm
        locale={locale}
        mode="edit"
        roles={roles}
        districts={districts}
        action={updateUser}
        defaults={{
          id: user.id,
          email: user.email ?? "",
          name: user.name ?? "",
          status: user.status,
          userLocale: user.locale,
          roleIds: user.userRoles.map((ur) => ur.roleId),
          districtId: user.districtId ?? "",
        }}
      />

      <section className="flex max-w-md flex-col gap-2 border-t border-gray-200 pt-4 dark:border-gray-800">
        <h2 className="text-lg font-semibold">{t("resetPassword")}</h2>
        <ResetPasswordForm locale={locale} id={user.id} />
      </section>

      {!isSelf && (
        <div className="max-w-md border-t border-gray-200 pt-4 dark:border-gray-800">
          <DeleteButton
            action={deleteUser}
            id={user.id}
            locale={locale}
            label={tc("delete")}
            confirmText={t("confirmDelete")}
          />
        </div>
      )}
    </div>
  );
}
