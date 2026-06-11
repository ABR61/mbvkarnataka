"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ImportState } from "@/lib/import";

export function ImportForm({
  locale,
  action,
  templateHref,
  columnsHint,
}: {
  locale: string;
  action: (prev: ImportState, formData: FormData) => Promise<ImportState>;
  templateHref: string;
  columnsHint: string;
}) {
  const t = useTranslations("Import");
  const te = useTranslations("ImportErrors");
  const [state, formAction, pending] = useActionState(action, {});

  const td = "px-3 py-1.5 border-t border-gray-100 dark:border-gray-800";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">{columnsHint}</span>
        <a href={templateHref} download className="text-emerald-700 hover:underline">
          {t("downloadTemplate")}
        </a>
      </div>

      <textarea
        name="csv"
        rows={10}
        placeholder={t("pastePlaceholder")}
        className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm outline-none focus:border-emerald-500 dark:border-gray-700 dark:bg-gray-900"
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          name="mode"
          value="preview"
          disabled={pending}
          className="rounded-md border border-emerald-600 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        >
          {t("preview")}
        </button>
        <button
          type="submit"
          name="mode"
          value="commit"
          disabled={pending || !state.rows || state.validCount === 0}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {t("import")}
        </button>
      </div>

      {state.error && (
        <p className="text-sm text-red-600">{te(state.error)}</p>
      )}

      {state.ran === "commit" && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
          {t("imported", { committed: state.committed ?? 0, total: state.total ?? 0 })}
        </p>
      )}

      {state.ran === "preview" && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {t("previewSummary", {
            valid: state.validCount ?? 0,
            total: state.total ?? 0,
          })}
        </p>
      )}

      {state.rows && state.rows.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="px-3 py-1.5 text-left font-medium text-gray-500">#</th>
              <th className="px-3 py-1.5 text-left font-medium text-gray-500">
                {t("row")}
              </th>
              <th className="px-3 py-1.5 text-left font-medium text-gray-500">
                {t("result")}
              </th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((r) => (
              <tr key={r.line}>
                <td className={`${td} text-gray-400`}>{r.line}</td>
                <td className={td}>{r.label}</td>
                <td className={td}>
                  {r.ok ? (
                    <span className="text-emerald-700">{t("ok")}</span>
                  ) : (
                    <span className="text-red-600">
                      {r.errors.map((e) => te(e)).join("; ")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </form>
  );
}
