import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

// Prev/next pagination preserving the current search query. `basePath` is the
// locale-less route (e.g. "/admin/centers"); next-intl's Link adds the locale.
export async function Pagination({
  basePath,
  page,
  pageSize,
  total,
  query = "",
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
  query?: string;
}) {
  const t = await getTranslations("Common");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const btn =
    "rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800";
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav className="mt-4 flex items-center justify-between text-sm">
      <Link href={href(page - 1)} className={`${btn} ${page <= 1 ? disabled : ""}`}>
        {t("previous")}
      </Link>
      <span className="text-gray-500">
        {t("pageOf", { page, total: totalPages })}
      </span>
      <Link
        href={href(page + 1)}
        className={`${btn} ${page >= totalPages ? disabled : ""}`}
      >
        {t("next")}
      </Link>
    </nav>
  );
}
