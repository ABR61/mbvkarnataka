import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { homeFor, homePath } from "@/lib/home";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Optional return path (must be an internal path) to send the user back to
  // where they came from (e.g. the "Login to plan" button on Future programs).
  const { callbackUrl } = await searchParams;
  const next = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : undefined;

  // Already signed in → honour the return path, else go to their own area.
  const session = await auth();
  if (session?.user) {
    redirect(
      next ?? homePath(await homeFor(session.user.id, session.user.permissions), locale),
    );
  }

  const t = await getTranslations("SignIn");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 p-8 shadow-sm dark:border-gray-800">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-gray-500">{t("subtitle")}</p>
        </div>
        <SignInForm locale={locale} callbackUrl={next} />
      </div>
    </main>
  );
}
