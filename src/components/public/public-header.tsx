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

  // About dropdown. Objectives and how-it-works are sections of /about, so they
  // live here rather than competing as top-level links.
  // Hashes go in the path string — next-intl derives the fragment by splitting
  // the pathname on '#', so the {pathname, hash} object form doesn't localize.
  const aboutItems = [
    { href: "/about", label: t("aboutUs") },
    { href: "/about#objectives", label: t("objectives") },
    { href: "/about#how", label: t("howItWorks") },
    { href: "/contact", label: tc("contactTitle") },
  ];

  // Past events go via the branches list: visitors pick a branch and browse that
  // branch's photos on its page. Branches also stays as a top-level link, for
  // visitors heading straight there rather than looking for past events.
  const programsItems = [
    { href: "/branches", label: t("pastEvents") },
    { href: "/future-programs", label: tc("futureCta") },
    { href: "/programs", label: t("trainingPrograms") },
  ];

  // Flattened list for the mobile menu (dropdowns expand into their links).
  const mobileLinks = [
    { href: "/", label: t("home") },
    ...aboutItems,
    ...programsItems,
    { href: "/branches", label: t("branches") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
      <div className="flex items-center gap-4 px-6 py-3">
        {/* Organisation name over its tagline, both localized. No logo artwork
            exists yet; if one arrives it goes to the left of this block. */}
        <Link href="/" className="flex shrink-0 flex-col leading-tight">
          <span className="text-base font-bold text-emerald-700">
            {tc("title")}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {tc("tagline")}
          </span>
        </Link>

        {/* Desktop: single inline row, right-aligned. Every item is shrink-0 and
            nowrap — otherwise a tight row compresses the links until they read
            as one run-on line, which looks like the gap has vanished. */}
        <nav className="ml-auto hidden items-center gap-x-6 text-sm whitespace-nowrap lg:flex xl:gap-x-7">
          <Link href="/" className="shrink-0 hover:text-emerald-700">
            {t("home")}
          </Link>
          <NavDropdown label={t("about")} items={aboutItems} />
          <NavDropdown label={t("programs")} items={programsItems} />
          <Link href="/branches" className="shrink-0 hover:text-emerald-700">
            {t("branches")}
          </Link>
          <Link
            href={apply.href}
            className="shrink-0 rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            {apply.label}
          </Link>
          {area && (
            <Link
              href={area.href}
              className="shrink-0 font-medium text-emerald-700 hover:underline"
            >
              {area.label}
            </Link>
          )}
          <div className="shrink-0">
            <LocaleSwitcher />
          </div>
          {loggedIn ? (
            <form action={signOutAction} className="shrink-0">
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
              className="shrink-0 rounded-md border border-emerald-600 px-3 py-1.5 font-medium text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
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
