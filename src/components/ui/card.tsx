import type { ReactNode } from "react";

/**
 * Bordered surface used throughout the admin screens. Replaces the repeated
 * inline `rounded-xl border border-gray-200 p-5 …` strings.
 */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 p-5 dark:border-gray-800 ${className}`}
    >
      {children}
    </div>
  );
}

/** A labelled headline number (income, balance, totals …). */
export function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <Card>
      <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
      <div className="mt-1 text-xs text-gray-500">{label}</div>
    </Card>
  );
}
