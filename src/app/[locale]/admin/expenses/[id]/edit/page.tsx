import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, assertDistrict } from "@/lib/auth-guards";
import { scopedDistrictId } from "@/lib/branch-scope";
import { localized } from "@/lib/localized";
import { formatINR } from "@/lib/money";
import { hasPermission } from "@/lib/rbac";
import {
  programOptions,
  cohortOptions,
  centerOptions,
  vendorOptions,
  grantOptions,
  districtOptions,
} from "@/lib/options";
import { DeleteButton } from "@/components/admin/delete-button";
import { StatusPill } from "@/components/ui/badge";
import { ExpenseForm } from "../../expense-form";
import { ExpenseWorkflow } from "../../expense-workflow";
import {
  updateExpense,
  deleteExpense,
  approveExpense,
  markPaidExpense,
  voidExpense,
} from "../../actions";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const session = await requirePermission("expense.record");

  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense) notFound();
  assertDistrict(session, expense.districtId); // branch admins: own district only

  const scope = scopedDistrictId(session);
  const [programs, cohorts, centers, vendors, grants, districts, fixed] =
    await Promise.all([
      programOptions(locale),
      cohortOptions(locale),
      centerOptions(locale),
      vendorOptions(),
      grantOptions(),
      scope ? Promise.resolve(undefined) : districtOptions(locale),
      expense.districtId
        ? prisma.district.findUnique({ where: { id: expense.districtId } })
        : Promise.resolve(null),
    ]);

  // Resolve the actor names shown in the audit panel.
  const actorIds = [expense.approvedById, expense.paidById, expense.voidedById].filter(
    (x): x is string => !!x,
  );
  const actors = actorIds.length
    ? await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const actorName = (uid: string | null) =>
    uid ? (actors.find((a) => a.id === uid)?.name ?? actors.find((a) => a.id === uid)?.email ?? uid) : "—";

  const t = await getTranslations("Expenses");
  const tc = await getTranslations("Common");
  const isPending = expense.status === "PENDING";
  const perms = session.user.permissions;

  const dl = (label: string, value: string) => (
    <div className="flex justify-between gap-4 border-t border-gray-100 py-1.5 text-sm dark:border-gray-800">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{t("editTitle")}</h1>
        <StatusPill status={expense.status} label={t(`status_${expense.status}`)} />
      </div>

      {/* Audit / payment summary */}
      <dl className="max-w-xl">
        {dl(t("amount"), formatINR(expense.amount.toString()))}
        {expense.approvedAt &&
          dl(
            t("approvedBy"),
            `${actorName(expense.approvedById)} · ${expense.approvedAt.toISOString().slice(0, 10)}`,
          )}
        {expense.paidAt &&
          dl(
            t("paidBy"),
            `${actorName(expense.paidById)} · ${expense.paidAt.toISOString().slice(0, 10)}`,
          )}
        {expense.paymentMethod && dl(t("paymentMethod"), t(`method_${expense.paymentMethod}`))}
        {expense.paymentReference && dl(t("paymentReference"), expense.paymentReference)}
        {expense.status === "VOID" &&
          dl(t("voidReason"), expense.voidReason ?? "—")}
      </dl>

      {/* Editing is only possible while pending; otherwise the record is locked. */}
      {isPending ? (
        <ExpenseForm
          locale={locale}
          programs={programs}
          cohorts={cohorts}
          centers={centers}
          vendors={vendors}
          grants={grants}
          districts={districts}
          fixedDistrictName={scope && fixed ? localized(fixed.name, locale) : undefined}
          action={updateExpense}
          defaults={{
            id: expense.id,
            amount: expense.amount.toString(),
            incurredOn: expense.incurredOn.toISOString().slice(0, 10),
            category: expense.category ?? "",
            vendorId: expense.vendorId ?? "",
            grantId: expense.grantId ?? "",
            note: expense.note ?? "",
            programId: expense.programId ?? "",
            cohortId: expense.cohortId ?? "",
            centerId: expense.centerId ?? "",
            districtId: expense.districtId ?? "",
          }}
        />
      ) : (
        <p className="max-w-xl rounded-md bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-900">
          {t("locked")}
        </p>
      )}

      {/* Maker-checker controls */}
      <ExpenseWorkflow
        locale={locale}
        id={expense.id}
        status={expense.status}
        canApprove={hasPermission(perms, "expense.approve")}
        canPay={hasPermission(perms, "expense.pay")}
        approve={approveExpense}
        markPaid={markPaidExpense}
        voidExpense={voidExpense}
      />

      {/* Only a pending expense can be deleted outright. */}
      {isPending && (
        <div className="max-w-xl border-t border-gray-200 pt-4 dark:border-gray-800">
          <DeleteButton
            action={deleteExpense}
            id={expense.id}
            locale={locale}
            label={tc("delete")}
            confirmText={t("confirmDelete")}
          />
        </div>
      )}
    </div>
  );
}
