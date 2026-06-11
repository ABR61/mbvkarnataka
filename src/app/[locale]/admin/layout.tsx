import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";

// Auth boundary for the whole back-office. Per Next 16 guidance, the proxy is only for
// optimistic checks — the real authorization gate lives here in the layout (Server
// Component), which runs on every /[locale]/admin/** request.
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) redirect(`/${locale}/sign-in`);

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar user={session.user} locale={locale} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
