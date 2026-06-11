import { z } from "zod";

const optionalStr = z.string().trim().optional().default("");
const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(0).nullable(),
);

export const COHORT_STATUSES = [
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export const cohortInput = z.object({
  programId: z.string().trim().min(1, "required"),
  centerId: z.string().trim().min(1, "required"),
  coordinatorId: optionalStr,
  code: optionalStr,
  startDate: optionalStr, // YYYY-MM-DD
  endDate: optionalStr,
  capacity: optionalInt,
  status: z.enum(COHORT_STATUSES),
});

export type CohortInput = z.infer<typeof cohortInput>;

export function cohortFromForm(formData: FormData) {
  return {
    programId: formData.get("programId"),
    centerId: formData.get("centerId"),
    coordinatorId: formData.get("coordinatorId") ?? "",
    code: formData.get("code") ?? "",
    startDate: formData.get("startDate") ?? "",
    endDate: formData.get("endDate") ?? "",
    capacity: formData.get("capacity") ?? "",
    status: formData.get("status"),
  };
}

/** Parse a YYYY-MM-DD string to a Date (UTC midnight) or null. */
export function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}
