import "server-only";
import { prisma } from "@/lib/prisma";

const num = (v: unknown) => (v == null ? 0 : Number(v));

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
  recent: {
    id: string;
    amount: number;
    category: string;
    status: string;
    incurredOn: string;
  }[];
};

/** Roll up the whole org's money picture for the admin financial-status view. */
export async function financialStatus(): Promise<FinancialStatus> {
  const [grantAgg, budgetAgg, expenseAgg, byStatus, byCategoryRaw, recentRaw] =
    await Promise.all([
      prisma.grant.aggregate({ _sum: { amount: true } }),
      prisma.budget.aggregate({ _sum: { amount: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["status"], _sum: { amount: true } }),
      prisma.expense.groupBy({ by: ["category"], _sum: { amount: true } }),
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

  const income = num(grantAgg._sum.amount);
  const expensesTotal = num(expenseAgg._sum.amount);

  return {
    income,
    budget: num(budgetAgg._sum.amount),
    expensesTotal,
    paid: statusSum("PAID"),
    approved: statusSum("APPROVED"),
    pending: statusSum("PENDING"),
    balance: income - expensesTotal,
    salary: sumMatching("salary"),
    events: sumMatching("event"),
    byCategory,
    recent: recentRaw.map((e) => ({
      id: e.id,
      amount: num(e.amount),
      category: e.category?.trim() || "Uncategorised",
      status: e.status,
      incurredOn: e.incurredOn.toISOString().slice(0, 10),
    })),
  };
}
