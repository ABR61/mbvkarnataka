import { describe, it, expect } from "vitest";
import { expenseInput, budgetInput, payInput } from "@/lib/validation/expense";

describe("expenseInput", () => {
  // Status is no longer part of the input — new expenses are always PENDING and
  // move through the approval workflow. The create/edit form only carries these.
  const base = { incurredOn: "2026-06-01" };

  it("accepts a well-formed amount", () => {
    expect(expenseInput.safeParse({ ...base, amount: "1234.50" }).success).toBe(true);
    expect(expenseInput.safeParse({ ...base, amount: "1000" }).success).toBe(true);
  });

  it("rejects bad amounts, three decimals, zero and negatives", () => {
    expect(expenseInput.safeParse({ ...base, amount: "12.345" }).success).toBe(false);
    expect(expenseInput.safeParse({ ...base, amount: "abc" }).success).toBe(false);
    expect(expenseInput.safeParse({ ...base, amount: "-5" }).success).toBe(false);
    expect(expenseInput.safeParse({ ...base, amount: "0" }).success).toBe(false);
  });

  it("requires a date", () => {
    expect(expenseInput.safeParse({ amount: "10", incurredOn: "" }).success).toBe(false);
  });
});

describe("payInput", () => {
  it("requires a known payment method and a date", () => {
    expect(
      payInput.safeParse({ paymentMethod: "UPI", paidOn: "2026-06-01", paymentReference: "x" }).success,
    ).toBe(true);
    expect(payInput.safeParse({ paymentMethod: "NOPE", paidOn: "2026-06-01" }).success).toBe(false);
    expect(payInput.safeParse({ paymentMethod: "CASH", paidOn: "" }).success).toBe(false);
  });
});

describe("budgetInput", () => {
  it("requires a program and a valid amount", () => {
    expect(budgetInput.safeParse({ programId: "p1", amount: "5000" }).success).toBe(true);
    expect(budgetInput.safeParse({ programId: "", amount: "5000" }).success).toBe(false);
    expect(budgetInput.safeParse({ programId: "p1", amount: "five" }).success).toBe(false);
  });
});
