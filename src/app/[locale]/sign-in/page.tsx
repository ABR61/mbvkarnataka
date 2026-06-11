import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Already signed in → go straight to the back-office.
  const session = await auth();
  if (session?.user) redirect(`/${locale}/admin`);

  const t = await getTranslations("SignIn");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 p-8 shadow-sm dark:border-gray-800">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <SignInForm locale={locale} />
      </div>
    </main>
  );
}
