import type { ZodError } from "zod";

// Shared shape returned by form server actions and consumed via useActionState.
export type FormState = {
  ok?: boolean;
  error?: string; // top-level/global error message key or text
  fieldErrors?: Record<string, string>; // field name → first error message
};

/** Collapse a ZodError into a flat { field: firstMessage } map keyed by top-level path. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}
