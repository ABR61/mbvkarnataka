import { setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/public/public-header";
import { SiteFooter } from "@/components/public/site-footer";

// Public marketing site — open to everyone (programs, reports, branches…).
// Only the /admin and /portal areas require sign-in (gated in their own layouts).
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
