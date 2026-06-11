import { z } from "zod";

export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "PAID"] as const;
export type ExpenseStatusValue = (typeof EXPENSE_STATUSES)[number];

// Money as a string keeps Decimal precision (no float rounding).
const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "amount");
const optionalStr = z.string().trim().optional().default("");

export const expenseInput = z.object({
  amount: money,
  incurredOn: z.string().trim().min(1, "required"), // YYYY-MM-DD
  category: optionalStr,
  vendor: optionalStr,
  note: optionalStr,
  programId: optionalStr,
  cohortId: optionalStr,
  centerId: optionalStr,
  status: z.enum(EXPENSE_STATUSES),
});

export type ExpenseInput = z.infer<typeof expenseInput>;

export function expenseFromForm(formData: FormData) {
  return {
    amount: formData.get("amount"),
    incurredOn: formData.get("incurredOn"),
    category: formData.get("category") ?? "",
    vendor: formData.get("vendor") ?? "",
    note: formData.get("note") ?? "",
    programId: formData.get("programId") ?? "",
    cohortId: formData.get("cohortId") ?? "",
    centerId: formData.get("centerId") ?? "",
    status: formData.get("status"),
  };
}

export const budgetInput = z.object({
  programId: z.string().trim().min(1, "required"),
  amount: money,
  note: optionalStr,
});
