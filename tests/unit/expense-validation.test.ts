import { describe, it, expect } from "vitest";
import { expenseInput, budgetInput } from "@/lib/validation/expense";

describe("expenseInput", () => {
  const base = { incurredOn: "2026-06-01", status: "APPROVED" as const };

  it("accepts a well-formed amount", () => {
    expect(expenseInput.safeParse({ ...base, amount: "1234.50" }).success).toBe(true);
    expect(expenseInput.safeParse({ ...base, amount: "1000" }).success).toBe(true);
  });

  it("rejects bad amounts and three decimals", () => {
    expect(expenseInput.safeParse({ ...base, amount: "12.345" }).success).toBe(false);
    expect(expenseInput.safeParse({ ...base, amount: "abc" }).success).toBe(false);
    expect(expenseInput.safeParse({ ...base, amount: "-5" }).success).toBe(false);
  });

  it("requires a date and a valid status", () => {
    expect(expenseInput.safeParse({ amount: "10", incurredOn: "", status: "PAID" }).success).toBe(false);
    expect(expenseInput.safeParse({ amount: "10", incurredOn: "2026-01-01", status: "NOPE" }).success).toBe(false);
  });
});

describe("budgetInput", () => {
  it("requires a program and a valid amount", () => {
    expect(budgetInput.safeParse({ programId: "p1", amount: "5000" }).success).toBe(true);
    expect(budgetInput.safeParse({ programId: "", amount: "5000" }).success).toBe(false);
    expect(budgetInput.safeParse({ programId: "p1", amount: "five" }).success).toBe(false);
  });
});
