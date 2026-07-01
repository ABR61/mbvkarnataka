import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Public site footer: brand + mission, quick links, and contact details.
export async function SiteFooter() {
  const t = await getTranslations("Public");
  const tc = await getTranslations("HomePage");
  const year = new Date().getFullYear();

  const links = [
    { href: "/", label: t("home") },
    { href: "/programs", label: t("programs") },
    { href: "/branches", label: t("branches") },
    { href: "/reports", label: tc("reportsCta") },
    { href: "/future-programs", label: tc("futureCta") },
    { href: "/contact", label: tc("contactTitle") },
    { href: "/apply", label: t("apply") },
  ];

  const phoneHref = `tel:${tc("contactPhone").replace(/\s+/g, "")}`;
  const emailHref = `mailto:${tc("contactEmail")}`;

  return (
    <footer className="mt-auto border-t border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-3">
        {/* Brand + mission */}
        <div>
          <div className="text-lg font-bold text-emerald-700">MBV</div>
          <p className="mt-2 font-medium">{tc("title")}</p>
          <p className="mt-1 max-w-xs text-sm text-gray-500">{tc("subtitle")}</p>
        </div>

        {/* Quick links */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {tc("footerLinks")}
          </h3>
          <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {links.map((l) => (
              <li key={l.label}>
                <Link href={l.href} className="text-gray-600 hover:text-emerald-700 dark:text-gray-300">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            {tc("contactTitle")}
          </h3>
          <ul className="mt-3 flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
            <li>
              <span className="text-gray-400">{tc("contactEmailLabel")}: </span>
              <a href={emailHref} className="text-emerald-700 hover:underline">
                {tc("contactEmail")}
              </a>
            </li>
            <li>
              <span className="text-gray-400">{tc("contactPhoneLabel")}: </span>
              <a href={phoneHref} className="text-emerald-700 hover:underline">
                {tc("contactPhone")}
              </a>
            </li>
            <li>
              <span className="text-gray-400">{tc("contactAddressLabel")}: </span>
              {tc("contactAddress")}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-400 dark:border-gray-800">
        © {year} Manava Bandhutva Vedike (MBV). {tc("footerRights")}
      </div>
    </footer>
  );
}
