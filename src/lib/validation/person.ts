import { z } from "zod";
import type { Gender } from "@prisma/client";

export const GENDERS = ["MALE", "FEMALE", "OTHER", "UNDISCLOSED"] as const;

const optionalStr = z.string().trim().optional().default("");
const genderField = z.union([z.literal(""), z.enum(GENDERS)]).optional().default("");
const emailOptional = z
  .union([z.literal(""), z.email("invalid")])
  .optional()
  .default("");

const core = {
  firstName: z.string().trim().min(1, "required"),
  lastName: optionalStr,
  gender: genderField,
  dateOfBirth: optionalStr, // "YYYY-MM-DD" or ""
  phone: optionalStr,
  address: optionalStr,
  districtId: optionalStr,
};

export const traineeInput = z.object({ ...core, email: emailOptional });
export const trainerUpdateInput = z.object({ ...core, email: emailOptional });
export const trainerCreateInput = z.object({
  ...core,
  email: z.email("invalid"),
  password: z.string().min(8, "min8"),
});

export type TraineeInput = z.infer<typeof traineeInput>;
export type TrainerUpdateInput = z.infer<typeof trainerUpdateInput>;
export type TrainerCreateInput = z.infer<typeof trainerCreateInput>;

export function personFromForm(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    gender: formData.get("gender") ?? "",
    dateOfBirth: formData.get("dateOfBirth") ?? "",
    phone: formData.get("phone") ?? "",
    email: formData.get("email") ?? "",
    address: formData.get("address") ?? "",
    districtId: formData.get("districtId") ?? "",
    password: formData.get("password") ?? "",
  };
}

/** Map validated person fields to Prisma scalar data (empty strings → null). */
export function personScalars(
  d: {
    firstName: string;
    lastName: string;
    gender: "" | (typeof GENDERS)[number];
    phone: string;
    email: string;
    address: string;
    districtId: string;
  },
  dateOfBirth: Date | null,
) {
  return {
    firstName: d.firstName,
    lastName: d.lastName || null,
    gender: d.gender ? (d.gender as Gender) : null,
    dateOfBirth,
    phone: d.phone || null,
    email: d.email || null,
    address: d.address || null,
    districtId: d.districtId || null,
  };
}

/** Parse a YYYY-MM-DD birth date and enforce the 18+ rule (trainees are adults). */
export function parseDateOfBirth(s: string): {
  date: Date | null;
  error?: "invalid" | "under18";
} {
  if (!s) return { date: null };
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return { date: null, error: "invalid" };
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const m = now.getUTCMonth() - d.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  if (age < 18) return { date: d, error: "under18" };
  return { date: d };
}
