import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth(); // layout enforced auth

  const person = await prisma.person.findUnique({
    where: { userId: session!.user.id },
  });

  const t = await getTranslations("Portal");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("editProfile")}</h1>
      {person ? (
        <ProfileForm
          locale={locale}
          defaults={{
            phone: person.phone ?? "",
            email: person.email ?? "",
            address: person.address ?? "",
          }}
        />
      ) : (
        <p className="text-gray-500">{t("noProfile")}</p>
      )}
    </div>
  );
}
