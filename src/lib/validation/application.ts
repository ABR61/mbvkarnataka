import { z } from "zod";
import { GENDERS } from "@/lib/validation/person";

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
  "CONVERTED",
] as const;
export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

const optionalStr = z.string().trim().optional().default("");
const genderField = z.union([z.literal(""), z.enum(GENDERS)]).optional().default("");
const emailOptional = z
  .union([z.literal(""), z.email("invalid")])
  .optional()
  .default("");

export const applicationInput = z.object({
  firstName: z.string().trim().min(1, "required"),
  lastName: optionalStr,
  phone: z.string().trim().min(1, "required"),
  email: emailOptional,
  gender: genderField,
  dateOfBirth: optionalStr, // YYYY-MM-DD
  districtId: optionalStr,
  programId: optionalStr,
  message: optionalStr,
});

export type ApplicationInput = z.infer<typeof applicationInput>;

export function applicationFromForm(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    phone: formData.get("phone"),
    email: formData.get("email") ?? "",
    gender: formData.get("gender") ?? "",
    dateOfBirth: formData.get("dateOfBirth") ?? "",
    districtId: formData.get("districtId") ?? "",
    programId: formData.get("programId") ?? "",
    message: formData.get("message") ?? "",
  };
}
