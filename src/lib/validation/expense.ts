import { z } from "zod";

// All statuses (the lifecycle). New expenses always start PENDING; transitions
// happen through the approve/pay/void workflow actions, never a free dropdown.
export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "PAID", "VOID"] as const;
export type ExpenseStatusValue = (typeof EXPENSE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "UPI",
  "CHEQUE",
  "CARD",
  "OTHER",
] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

// Money as a string keeps Decimal precision (no float rounding). Must be
// positive and within the schema's Decimal(12,2) range.
const money = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "amount")
  .refine((v) => Number(v) > 0 && Number(v) <= 9_999_999_999.99, "amount");
const optionalStr = z.string().trim().optional().default("");

export const expenseInput = z.object({
  amount: money,
  incurredOn: z.string().trim().min(1, "required"), // YYYY-MM-DD
  category: optionalStr,
  vendorId: optionalStr,
  grantId: optionalStr,
  note: optionalStr,
  programId: optionalStr,
  cohortId: optionalStr,
  centerId: optionalStr,
});

export type ExpenseInput = z.infer<typeof expenseInput>;

export function expenseFromForm(formData: FormData) {
  return {
    amount: formData.get("amount"),
    incurredOn: formData.get("incurredOn"),
    category: formData.get("category") ?? "",
    vendorId: formData.get("vendorId") ?? "",
    grantId: formData.get("grantId") ?? "",
    note: formData.get("note") ?? "",
    programId: formData.get("programId") ?? "",
    cohortId: formData.get("cohortId") ?? "",
    centerId: formData.get("centerId") ?? "",
  };
}

// Captured when an approved expense is marked paid.
export const payInput = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentReference: optionalStr,
  paidOn: z.string().trim().min(1, "required"),
});

export function payFromForm(formData: FormData) {
  return {
    paymentMethod: formData.get("paymentMethod"),
    paymentReference: formData.get("paymentReference") ?? "",
    paidOn: formData.get("paidOn"),
  };
}

// A void (reversal) always requires a reason, for the audit trail.
export const voidInput = z.object({
  reason: z.string().trim().min(3, "required"),
});

export const budgetInput = z.object({
  programId: z.string().trim().min(1, "required"),
  amount: money,
  note: optionalStr,
});

export const vendorInput = z.object({
  name: z.string().trim().min(1, "required"),
  contactPerson: optionalStr,
  phone: optionalStr,
  email: z.union([z.literal(""), z.email("invalid")]).optional().default(""),
  note: optionalStr,
});

export const grantInput = z.object({
  funder: z.string().trim().min(1, "required"),
  amount: money,
  reference: optionalStr,
  receivedOn: z.string().trim().min(1, "required"),
  purpose: optionalStr,
  note: optionalStr,
  // Booleans arrive from checkboxes ("on"/absent); coerced in the action.
});
