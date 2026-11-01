import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { hasPermission, type Permission } from "@/lib/rbac";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// In-app how-to guide for the logged-in admin area (the admin layout enforces
// sign-in). One section per admin page, shown only if the viewer's role can
// open that page. Section ids match the page's first path segment so the
// topbar "?" link (HelpLink) can jump straight to the right section.

type Group = "overview" | "training" | "admissions" | "outcomes" | "finance" | "admin";

const SECTIONS: {
  id: string; // anchor = route segment after /admin ("dashboard" for /admin)
  key: string; // message key under Help.pages
  href: string;
  permission: Permission | null; // keep in sync with the sidebar NAV
  group: Group;
}[] = [
  { id: "dashboard", key: "dashboard", href: "/admin", permission: null, group: "overview" },
  { id: "districts", key: "districts", href: "/admin/districts", permission: "center.manage", group: "training" },
  { id: "centers", key: "centers", href: "/admin/centers", permission: "center.manage", group: "training" },
  { id: "programs", key: "programs", href: "/admin/programs", permission: "cohort.manage", group: "training" },
  { id: "cohorts", key: "cohorts", href: "/admin/cohorts", permission: "cohort.manage", group: "training" },
  { id: "sessions", key: "sessions", href: "/admin/sessions", permission: "session.manage", group: "training" },
  { id: "trainees", key: "trainees", href: "/admin/trainees", permission: "trainee.manage", group: "training" },
  { id: "trainers", key: "trainers", href: "/admin/trainers", permission: "trainer.manage", group: "training" },
  { id: "staff", key: "staff", href: "/admin/staff", permission: "staff.manage", group: "training" },
  { id: "applications", key: "applications", href: "/admin/applications", permission: "application.manage", group: "admissions" },
  { id: "posts", key: "posts", href: "/admin/posts", permission: "post.manage", group: "admissions" },
  { id: "future-programs", key: "futurePrograms", href: "/admin/future-programs", permission: "program.plan", group: "admissions" },
  { id: "completions", key: "completions", href: "/admin/completions", permission: "feedback.manage", group: "outcomes" },
  { id: "feedback", key: "feedback", href: "/admin/feedback", permission: "feedback.manage", group: "outcomes" },
  { id: "reports", key: "reports", href: "/admin/reports", permission: "report.view", group: "outcomes" },
  { id: "finance", key: "finance", href: "/admin/finance", permission: "finance.manage", group: "finance" },
  { id: "expenses", key: "expenses", href: "/admin/expenses", permission: "expense.record", group: "finance" },
  { id: "grants", key: "grants", href: "/admin/grants", permission: "finance.manage", group: "finance" },
  { id: "users", key: "users", href: "/admin/users", permission: "user.manage", group: "admin" },
  { id: "audit", key: "audit", href: "/admin/audit", permission: "user.manage", group: "admin" },
];

const GROUP_ORDER: Group[] = ["overview", "training", "admissions", "outcomes", "finance", "admin"];

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth(); // the admin layout guarantees a signed-in user
  const perms = session?.user?.permissions ?? [];
  const t = await getTranslations("Help");

  const visible = SECTIONS.filter(
    (s) => s.permission === null || hasPermission(perms, s.permission),
  );
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    sections: visible.filter((s) => s.group === g),
  })).filter((g) => g.sections.length > 0);

  // The accounting deep-dive is relevant to anyone who records or manages money.
  const showAccounting =
    hasPermission(perms, "expense.record") || hasPermission(perms, "finance.manage");

  const list = (key: string) => t.raw(key) as string[];

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-gray-500">{t("intro")}</p>
      </div>

      {/* Table of contents */}
      <nav aria-label={t("contents")}>
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {t("contents")}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {groups.map(({ group, sections }) => (
              <div key={group}>
                <div className="text-xs font-semibold text-gray-500">{t(`groups.${group}`)}</div>
                <ul className="mt-1 flex flex-col gap-0.5 text-sm">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <a href={`#${s.id}`} className="text-emerald-700 hover:underline dark:text-emerald-400">
                        {t(`pages.${s.key}.title`)}
                      </a>
                    </li>
                  ))}
                  {group === "finance" && showAccounting && (
                    <li>
                      <a href="#accounting" className="text-emerald-700 hover:underline dark:text-emerald-400">
                        {t("accountingDeepDive")}
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      </nav>

      {/* One section per page */}
      {groups.map(({ group, sections }) => (
        <section key={group} className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">{t(`groups.${group}`)}</h2>

          {sections.map((s) => {
            const how = list(`pages.${s.key}.how`);
            const tips = list(`pages.${s.key}.tips`);
            return (
              <Card key={s.id}>
                <div id={s.id} className="scroll-mt-10 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold">{t(`pages.${s.key}.title`)}</h3>
                  <Link href={s.href} className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
                    {t("openPage")} →
                  </Link>
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {t(`pages.${s.key}.purpose`)}
                </p>

                <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {t("howTo")}
                </h4>
                <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">
                  {how.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>

                {tips.length > 0 && (
                  <>
                    <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("tips")}
                    </h4>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">
                      {tips.map((tip, i) => (
                        <li key={i}>{tip}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            );
          })}

          {/* Accounting deep-dive sits at the end of the finance group */}
          {group === "finance" && showAccounting && (
            <Card>
              <div id="accounting" className="scroll-mt-10">
                <h3 className="text-base font-semibold">{t("accountingDeepDive")}</h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t("acctIntro")}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="amber">{t("step1Title")}</Badge>
                <span aria-hidden className="text-gray-400">→</span>
                <Badge tone="blue">{t("step2Title")}</Badge>
                <span aria-hidden className="text-gray-400">→</span>
                <Badge tone="green">{t("step3Title")}</Badge>
                <span aria-hidden className="mx-1 text-gray-300">|</span>
                <Badge tone="red">{t("voidTitle")}</Badge>
              </div>

              <div className="mt-4 flex flex-col gap-4">
                {(
                  [
                    ["step1Title", "step1Body"],
                    ["step2Title", "step2Body"],
                    ["step3Title", "step3Body"],
                    ["sodTitle", "sodBody"],
                    ["lockTitle", "lockBody"],
                    ["voidTitle", "voidBody"],
                    ["fundsTitle", "fundsBody"],
                    ["budgetTitle", "budgetBody"],
                    ["rolesTitle", "rolesBody"],
                  ] as const
                ).map(([title, body]) => (
                  <div key={title}>
                    <h4 className="text-sm font-semibold">{t(title)}</h4>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{t(body)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      ))}
    </div>
  );
}
