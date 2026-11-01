import type { Prisma } from "@prisma/client";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-guards";
import { Badge, type Tone } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const ACTIONS = ["create", "update", "delete", "blocked"] as const;
const ACTION_TONE: Record<string, Tone> = {
  create: "green",
  update: "blue",
  delete: "red",
  blocked: "amber",
};

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ entity?: string; action?: string; page?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Audit logs expose who changed what across the platform — admin-only.
  await requirePermission("user.manage");

  const sp = await searchParams;
  const entity = (sp.entity ?? "").trim();
  const action = (sp.action ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {
    ...(entity ? { entity: { contains: entity, mode: "insensitive" } } : {}),
    ...(action ? { action } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Resolve actor ids → names in one query (AuditLog has no User relation).
  const userIds = [...new Set(rows.map((r) => r.userId).filter((id): id is string => !!id))];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userById = new Map(users.map((u) => [u.id, u.name ?? u.email ?? u.id]));

  const t = await getTranslations("Audit");
  const tc = await getTranslations("Common");
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const knownAction = (a: string): a is (typeof ACTIONS)[number] =>
    (ACTIONS as readonly string[]).includes(a);

  const th = "px-3 py-2 text-left font-medium text-gray-500";
  const td = "px-3 py-2 border-t border-gray-100 align-top dark:border-gray-800";

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    if (entity) qs.set("entity", entity);
    if (action) qs.set("action", action);
    if (p > 1) qs.set("page", String(p));
    const s = qs.toString();
    return s ? `/admin/audit?${s}` : "/admin/audit";
  };

  const fmt = (d: Date) =>
    new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(d);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
      </div>

      {/* Filters (GET form; sticky across pagination) */}
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500">{t("entity")}</span>
          <input
            name="entity"
            defaultValue={entity}
            placeholder={t("entityHint")}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-500">{t("action")}</span>
          <select
            name="action"
            defaultValue={action}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">{t("allActions")}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {t(`action_${a}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {t("filter")}
        </button>
        {(entity || action) && (
          <Link href="/admin/audit" className="py-1.5 text-sm text-gray-500 hover:underline">
            {t("clear")}
          </Link>
        )}
      </form>

      <p className="text-xs text-gray-500">{t("resultCount", { count: total })}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr>
              <th className={th}>{t("time")}</th>
              <th className={th}>{t("user")}</th>
              <th className={th}>{t("action")}</th>
              <th className={th}>{t("entity")}</th>
              <th className={th}>{t("entityId")}</th>
              <th className={th}>{t("details")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className={`${td} text-gray-400`} colSpan={6}>
                  {t("empty")}
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>{fmt(r.createdAt)}</td>
                  <td className={td}>
                    {r.userId ? (userById.get(r.userId) ?? r.userId) : t("system")}
                  </td>
                  <td className={td}>
                    <Badge tone={ACTION_TONE[r.action] ?? "gray"}>
                      {knownAction(r.action) ? t(`action_${r.action}`) : r.action}
                    </Badge>
                  </td>
                  <td className={`${td} font-medium`}>{r.entity}</td>
                  <td className={`${td} font-mono text-xs text-gray-500`}>
                    {r.entityId ?? "—"}
                  </td>
                  <td className={`${td} max-w-xs`}>
                    {r.metadata != null && (
                      <code className="block truncate text-xs text-gray-500">
                        {JSON.stringify(r.metadata)}
                      </code>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-2 flex items-center justify-between text-sm">
          <Link
            href={pageHref(page - 1)}
            className={`rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
          >
            {tc("previous")}
          </Link>
          <span className="text-gray-500">{tc("pageOf", { page, total: totalPages })}</span>
          <Link
            href={pageHref(page + 1)}
            className={`rounded-md border border-gray-300 px-3 py-1.5 dark:border-gray-700 ${page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
          >
            {tc("next")}
          </Link>
        </nav>
      )}
    </div>
  );
}
