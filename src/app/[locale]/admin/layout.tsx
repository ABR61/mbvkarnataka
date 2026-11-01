import { Suspense } from "react";
import { redirect } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Sidebar, adminNavItems } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { AdminBackLink } from "@/components/admin/back-link";
import { FlashToast } from "@/components/flash-toast";

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
  // Users with no staff permissions (i.e. trainees) belong in the portal.
  if (session.user.permissions.length === 0) redirect(`/${locale}/portal`);

  const navItems = await adminNavItems(session.user.permissions);

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar items={navItems} brand="MBV" />
      {/* min-w-0 lets wide tables scroll inside their own box instead of
          stretching the whole page sideways on phones. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={session.user} locale={locale} navItems={navItems} />
        <main className="flex-1 p-4 md:p-6">
          <AdminBackLink items={navItems} />
          {children}
        </main>
      </div>
      {/* "Saved ✓" / "Deleted ✓" confirmation after actions that redirect. */}
      <Suspense fallback={null}>
        <FlashToast />
      </Suspense>
    </div>
  );
}
