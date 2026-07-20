import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions/auth";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { NavDropdown } from "@/components/public/nav-dropdown";
import { MobileMenu } from "@/components/public/mobile-menu";

// Public marketing header: logo left, menu right with the About>Contact dropdown
// on desktop and a hamburger on narrow screens. Shows Login when signed out and
// Sign out when signed in.
export async function PublicHeader() {
  const t = await getTranslations("Public");
  const tc = await getTranslations("HomePage");
  const locale = await getLocale();
  const session = await auth();
  const loggedIn = !!session?.user;
  // Staff (have permissions) go to /admin; trainees to their /portal.
  const isStaff = (session?.user?.permissions?.length ?? 0) > 0;
  const area = loggedIn
    ? {
        href: isStaff ? "/admin" : "/portal",
        label: isStaff ? t("dashboard") : t("myPortal"),
      }
    : null;

  const apply = { href: "/apply", label: t("apply") };

  // Plain links shown after the About dropdown on desktop. Objectives and
  // how-it-works are sections of /about now, not anchors on the home page.
  const rest = [
    { href: { pathname: "/about", hash: "objectives" }, label: t("objectives") },
    { href: { pathname: "/about", hash: "how" }, label: t("howItWorks") },
    { href: "/branches", label: t("branches") },
  ];

  // Programs dropdown groups programs and future programs. Activities aren't
  // here — they're the home page.
  const programsItems = [
    { href: "/programs", label: t("programs") },
    { href: "/future-programs", label: tc("futureCta") },
  ];

  // Flattened list for the mobile menu (dropdowns expand into their links).
  const mobileLinks = [
    { href: { pathname: "/", hash: "top" }, label: t("home") },
    { href: "/about", label: t("aboutUs") },
    { href: "/contact", label: tc("contactTitle") },
    ...rest,
    ...programsItems,
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="flex items-center gap-4 px-6 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold text-emerald-700">
          MBV
        </Link>

        {/* Desktop: full inline row, right-aligned, with spacing */}
        <nav className="ml-auto hidden items-center gap-x-5 text-sm lg:flex">
          <Link href={{ pathname: "/", hash: "top" }} className="hover:text-emerald-700">
            {t("home")}
          </Link>
          <NavDropdown
            label={t("about")}
            items={[
              { href: "/about", label: t("aboutUs") },
              { href: "/contact", label: tc("contactTitle") },
            ]}
          />
          {rest.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-emerald-700">
              {l.label}
            </Link>
          ))}
          <NavDropdown label={t("programs")} items={programsItems} />
          <Link
            href={apply.href}
            className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            {apply.label}
          </Link>
          {area && (
            <Link
              href={area.href}
              className="font-medium text-emerald-700 hover:underline"
            >
              {area.label}
            </Link>
          )}
          <LocaleSwitcher />
          {loggedIn ? (
            <form action={signOutAction}>
              <input type="hidden" name="locale" value={locale} />
              <button
                type="submit"
                className="text-gray-500 hover:text-emerald-700"
              >
                {t("signOut")}
              </button>
            </form>
          ) : (
            <Link
              href="/sign-in"
              className="rounded-md border border-emerald-600 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              {t("login")}
            </Link>
          )}
        </nav>

        {/* Narrow screens: hamburger */}
        <div className="ml-auto lg:hidden">
          <MobileMenu
            links={mobileLinks}
            apply={apply}
            auth={{
              loggedIn,
              area,
              signOut: { action: signOutAction, locale, label: t("signOut") },
              login: { href: "/sign-in", label: t("login") },
            }}
            menuLabel={t("menu")}
          />
        </div>
      </div>
    </header>
  );
}
