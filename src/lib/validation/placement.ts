import { z } from "zod";

export const PLACEMENT_STATUSES = ["PLACED", "ACTIVE", "EXITED"] as const;
export const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "SELF_EMPLOYED",
  "APPRENTICESHIP",
] as const;

const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "amount");
const optionalStr = z.string().trim().optional().default("");

export const employerInput = z.object({
  name: z.string().trim().min(1, "required"),
  sector: optionalStr,
  contactPerson: optionalStr,
  phone: optionalStr,
  email: z.union([z.literal(""), z.email("invalid")]).optional().default(""),
  districtId: optionalStr,
  note: optionalStr,
});

export const placementInput = z.object({
  personId: z.string().trim().min(1, "required"),
  employerId: z.string().trim().min(1, "required"),
  jobTitle: optionalStr,
  employmentType: z
    .union([z.literal(""), z.enum(EMPLOYMENT_TYPES)])
    .optional()
    .default(""),
  monthlySalary: z.union([z.literal(""), money]).optional().default(""),
  placedOn: z.string().trim().min(1, "required"),
  status: z.enum(PLACEMENT_STATUSES),
  note: optionalStr,
});

export const followUpInput = z.object({
  followUpOn: z.string().trim().min(1, "required"),
  periodMonths: z
    .union([z.literal(""), z.string().regex(/^\d{1,3}$/, "months")])
    .optional()
    .default(""),
  stillEmployed: z.enum(["true", "false"]).default("true"),
  monthlyIncome: z.union([z.literal(""), money]).optional().default(""),
  note: optionalStr,
});

export type EmployerInput = z.infer<typeof employerInput>;
export type PlacementInput = z.infer<typeof placementInput>;
export type FollowUpInput = z.infer<typeof followUpInput>;
