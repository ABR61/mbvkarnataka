"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { APPLICATION_STATUSES } from "@/lib/validation/application";
import type { FormState } from "@/lib/forms";

type Option = { id: string; name: string };

const field =
  "rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900";

export function StatusForm({
  locale,
  id,
  status,
  reviewNote,
  action,
}: {
  locale: string;
  id: string;
  status: string;
  reviewNote: string;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Applications");
  const tc = useTranslations("Common");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{tc("status")}</span>
        <select name="status" defaultValue={status} className={field}>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`status_${s}`)}</option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("reviewNote")}</span>
        <textarea name="reviewNote" rows={3} defaultValue={reviewNote} className={field} />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {pending ? tc("saving") : tc("save")}
        </button>
        {state.ok && <span className="text-sm text-emerald-700">{t("saved")}</span>}
      </div>
    </form>
  );
}

/**
 * Two-stage approval controls. A branch admin can approve (send up) or reject;
 * only the super admin can grant final approval. Buttons shown depend on the
 * current stage and the viewer's role; the server action enforces the same rules.
 */
export function ApprovalPanel({
  locale,
  id,
  status,
  reviewNote,
  isSuperAdmin,
  action,
}: {
  locale: string;
  id: string;
  status: string;
  reviewNote: string;
  isSuperAdmin: boolean;
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Applications");
  const [state, formAction, pending] = useActionState(action, {});

  const green =
    "rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60";
  const red =
    "rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60";

  const awaitingStage1 = status === "SUBMITTED" || status === "UNDER_REVIEW";
  const note = (msg: string) => (
    <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
      {msg}
    </p>
  );

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("reviewNote")}</span>
        <textarea name="reviewNote" rows={3} defaultValue={reviewNote} className={field} />
      </label>

      {/* Stage 1 — branch admin */}
      {!isSuperAdmin && awaitingStage1 && (
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="status" value="BRANCH_APPROVED" disabled={pending} className={green}>
            {t("approveSendToAdmin")}
          </button>
          <button type="submit" name="status" value="REJECTED" disabled={pending} className={red}>
            {t("reject")}
          </button>
        </div>
      )}
      {!isSuperAdmin && status === "BRANCH_APPROVED" && note(t("awaitingFinal"))}

      {/* Stage 1 (override) & Stage 2 — super admin */}
      {isSuperAdmin && awaitingStage1 && (
        <>
          {note(t("awaitingBranch"))}
          <div className="flex flex-wrap gap-3">
            <button type="submit" name="status" value="BRANCH_APPROVED" disabled={pending} className={green}>
              {t("approveBranchStep")}
            </button>
            <button type="submit" name="status" value="REJECTED" disabled={pending} className={red}>
              {t("reject")}
            </button>
          </div>
        </>
      )}
      {isSuperAdmin && status === "BRANCH_APPROVED" && (
        <>
          {note(t("branchApprovedBy"))}
          <div className="flex flex-wrap gap-3">
            <button type="submit" name="status" value="ACCEPTED" disabled={pending} className={green}>
              {t("giveFinalApproval")}
            </button>
            <button type="submit" name="status" value="REJECTED" disabled={pending} className={red}>
              {t("reject")}
            </button>
          </div>
        </>
      )}

      {status === "ACCEPTED" && note(t("finalApproved"))}
      {status === "REJECTED" && note(t("wasRejected"))}

      {state.ok && <span className="text-sm text-emerald-700">{t("saved")}</span>}
    </form>
  );
}

export function ConvertForm({
  locale,
  id,
  cohorts,
  action,
}: {
  locale: string;
  id: string;
  cohorts: Option[];
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
}) {
  const t = useTranslations("Applications");
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{t("enrollInto")}</span>
        <select name="cohortId" defaultValue="" className={field}>
          <option value="">{t("noCohort")}</option>
          {cohorts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {pending ? t("converting") : t("convert")}
      </button>
      {state.error && (
        <span className="text-sm text-red-600">{t(`convertError_${state.error}`)}</span>
      )}
    </form>
  );
}
