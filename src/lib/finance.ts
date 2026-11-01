import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/localized";

const num = (v: unknown) => (v == null ? 0 : Number(v));
const dec = (v: unknown) => (v == null ? new Prisma.Decimal(0) : new Prisma.Decimal(v as never));

// Voided expenses are reversed — they never count toward spend or balances.
const NOT_VOID = { status: { not: "VOID" as const } };

export type CategoryTotal = { category: string; total: number };

export type FinancialStatus = {
  income: number; // total grants received
  budget: number; // total planned budget across programs
  expensesTotal: number;
  paid: number;
  approved: number;
  pending: number;
  balance: number; // income − total expenses
  salary: number; // expenses categorised as salary
  events: number; // expenses categorised as event
  byCategory: CategoryTotal[];
  byDistrict: { districtId: string | null; district: string; total: number }[]; // branch spend rolled up
  recent: {
    id: string;
    amount: number;
    category: string;
    status: string;
    incurredOn: string;
  }[];
};

/** Roll up the whole org's money picture for the admin financial-status view. */
export async function financialStatus(locale: string): Promise<FinancialStatus> {
  const [grantAgg, budgetAgg, expenseAgg, byStatus, byCategoryRaw, byDistrictRaw, districts, recentRaw] =
    await Promise.all([
      prisma.grant.aggregate({ _sum: { amount: true } }),
      prisma.budget.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ where: NOT_VOID, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["status"], _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["category"], where: NOT_VOID, _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["districtId"], where: NOT_VOID, _sum: { amount: true } }),
      prisma.district.findMany({ select: { id: true, name: true } }),
      prisma.expense.findMany({
        orderBy: { incurredOn: "desc" },
        take: 8,
        select: { id: true, amount: true, category: true, status: true, incurredOn: true },
      }),
    ]);

  const statusSum = (s: string) =>
    num(byStatus.find((r) => r.status === s)?._sum.amount);

  const byCategory: CategoryTotal[] = byCategoryRaw
    .map((r) => ({ category: r.category?.trim() || "Uncategorised", total: num(r._sum.amount) }))
    .sort((a, b) => b.total - a.total);

  const sumMatching = (needle: string) =>
    byCategory
      .filter((c) => c.category.toLowerCase().includes(needle))
      .reduce((s, c) => s + c.total, 0);

  const districtName = new Map(districts.map((d) => [d.id, d.name]));
  const byDistrict = byDistrictRaw
    .map((r) => ({
      districtId: r.districtId,
      district: r.districtId
        ? localized(districtName.get(r.districtId) ?? {}, locale) || "—"
        : "Head office",
      total: num(r._sum.amount),
    }))
    .sort((a, b) => b.total - a.total);

  const income = num(grantAgg._sum.amount);
  const expensesTotal = num(expenseAgg._sum.amount);
  // Decimal arithmetic for the headline balance (no float drift).
  const balance = num(dec(grantAgg._sum.amount).minus(dec(expenseAgg._sum.amount)));

  return {
    income,
    budget: num(budgetAgg._sum.amount),
    expensesTotal,
    paid: statusSum("PAID"),
    approved: statusSum("APPROVED"),
    pending: statusSum("PENDING"),
    balance,
    salary: sumMatching("salary"),
    events: sumMatching("event"),
    byCategory,
    byDistrict,
    recent: recentRaw.map((e) => ({
      id: e.id,
      amount: num(e.amount),
      category: e.category?.trim() || "Uncategorised",
      status: e.status,
      incurredOn: e.incurredOn.toISOString().slice(0, 10),
    })),
  };
}

export type GrantUtilizationRow = {
  id: string;
  funder: string;
  purpose: string | null;
  amount: number; // received
  committed: number; // approved + paid (non-void) drawing on this grant
  remaining: number; // amount − committed (can be negative = overspent)
  restricted: boolean;
  foreignSource: boolean;
  overspent: boolean;
};

/**
 * Fund accounting: how much of each grant has been committed (approved + paid,
 * excluding voided). Lets us show a funder exactly how their money was used and
 * flag restricted grants that are over-committed.
 */
export async function grantUtilization(): Promise<{
  grants: GrantUtilizationRow[];
  unallocatedCommitted: number; // committed spend not tied to any grant
}> {
  const [grants, committedByGrant, unallocated] = await Promise.all([
    prisma.grant.findMany({ orderBy: { receivedOn: "desc" } }),
    prisma.expense.groupBy({
      by: ["grantId"],
      where: { status: { in: ["APPROVED", "PAID"] }, grantId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.expense.aggregate({
      where: { status: { in: ["APPROVED", "PAID"] }, grantId: null },
      _sum: { amount: true },
    }),
  ]);

  const committedById = new Map(
    committedByGrant.map((r) => [r.grantId as string, dec(r._sum.amount)]),
  );

  const rows: GrantUtilizationRow[] = grants.map((g) => {
    const committed = committedById.get(g.id) ?? new Prisma.Decimal(0);
    const remaining = dec(g.amount).minus(committed);
    return {
      id: g.id,
      funder: g.funder,
      purpose: g.purpose,
      amount: num(g.amount),
      committed: num(committed),
      remaining: num(remaining),
      restricted: g.restricted,
      foreignSource: g.foreignSource,
      overspent: g.restricted && remaining.isNegative(),
    };
  });

  return { grants: rows, unallocatedCommitted: num(unallocated._sum.amount) };
}

export type BudgetVsActualRow = {
  programId: string;
  name: unknown; // { en, kn }
  budget: number;
  actual: number; // non-void spend on the program
  remaining: number;
  over: boolean;
};

/** Budget guardrail: planned budget vs actual (non-void) spend, per program. */
export async function budgetVsActual(): Promise<BudgetVsActualRow[]> {
  const [budgets, spendByProgram] = await Promise.all([
    prisma.budget.findMany({ include: { program: { select: { name: true } } } }),
    prisma.expense.groupBy({
      by: ["programId"],
      where: { ...NOT_VOID, programId: { not: null } },
      _sum: { amount: true },
    }),
  ]);
  const spendById = new Map(
    spendByProgram.map((r) => [r.programId as string, dec(r._sum.amount)]),
  );

  return budgets
    .map((b) => {
      const actual = spendById.get(b.programId) ?? new Prisma.Decimal(0);
      const remaining = dec(b.amount).minus(actual);
      return {
        programId: b.programId,
        name: b.program.name,
        budget: num(b.amount),
        actual: num(actual),
        remaining: num(remaining),
        over: remaining.isNegative(),
      };
    })
    .sort((a, b) => Number(b.over) - Number(a.over) || b.actual - a.actual);
}
