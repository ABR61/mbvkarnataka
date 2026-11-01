"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { PAYMENT_METHODS } from "@/lib/validation/expense";
import type { FormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";

type Act = (prev: FormState, formData: FormData) => Promise<FormState>;

// Status-aware maker-checker controls for one expense. Each transition is its
// own server action with its own result state.
export function ExpenseWorkflow({
  locale,
  id,
  status,
  canApprove,
  canPay,
  approve,
  markPaid,
  voidExpense,
}: {
  locale: string;
  id: string;
  status: "PENDING" | "APPROVED" | "PAID" | "VOID";
  canApprove: boolean;
  canPay: boolean;
  approve: Act;
  markPaid: Act;
  voidExpense: Act;
}) {
  const t = useTranslations("Expenses");
  const [approveState, approveAction, approving] = useActionState(approve, {});
  const [payState, payAction, paying] = useActionState(markPaid, {});
  const [voidState, voidAction, voiding] = useActionState(voidExpense, {});

  const field =
    "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";
  const err = (key?: string) =>
    key ? <span className="text-sm text-red-600">{t(`wf_${key}`)}</span> : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex max-w-xl flex-col gap-6">
      {/* Approve — only a pending expense, only by someone other than the recorder */}
      {status === "PENDING" && canApprove && (
        <form action={approveAction} className="flex flex-col gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={approving} size="sm">
              {t("approve")}
            </Button>
            <span className="text-xs text-gray-500">{t("approveHint")}</span>
          </div>
          {err(approveState.error)}
        </form>
      )}

      {/* Mark paid — captures payment details */}
      {status === "APPROVED" && canPay && (
        <form action={payAction} className="flex flex-col gap-3 rounded-md border border-gray-200 p-4 dark:border-gray-800">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <h3 className="text-sm font-semibold">{t("recordPayment")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t("paymentMethod")} *</span>
              <select name="paymentMethod" required className={field} defaultValue="">
                <option value="" disabled>
                  —
                </option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {t(`method_${m}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{t("paidOn")} *</span>
              <input name="paidOn" type="date" required defaultValue={today} className={field} />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("paymentReference")}</span>
            <input name="paymentReference" placeholder={t("paymentReferenceHint")} className={field} />
          </label>
          <div>
            <Button type="submit" disabled={paying} size="sm">
              {t("markPaid")}
            </Button>
          </div>
          {err(payState.error)}
        </form>
      )}

      {/* Void — available in any non-void state to those who can pay */}
      {status !== "VOID" && canPay && (
        <form action={voidAction} className="flex flex-col gap-2">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{t("voidReason")}</span>
            <input
              name="reason"
              required
              minLength={3}
              placeholder={t("voidReasonHint")}
              className={field}
            />
          </label>
          <div>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              disabled={voiding}
              onClick={(e) => {
                if (!window.confirm(t("confirmVoid"))) e.preventDefault();
              }}
            >
              {t("void")}
            </Button>
          </div>
          {err(voidState.error)}
        </form>
      )}
    </div>
  );
}
