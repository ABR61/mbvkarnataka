import { z } from "zod";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(0).nullable(),
);

const sequenceInt = z.preprocess(
  (v) => (v === "" || v == null ? 0 : Number(v)),
  z.number().int().min(0),
);

export const courseInput = z.object({
  programId: z.string().trim().min(1, "required"),
  nameEn: z.string().trim().min(1, "required"),
  nameKn: z.string().trim().optional().default(""),
  descEn: z.string().trim().optional().default(""),
  descKn: z.string().trim().optional().default(""),
  sequence: sequenceInt,
  hours: optionalInt,
});

export type CourseInput = z.infer<typeof courseInput>;

export function courseFromForm(formData: FormData) {
  return {
    programId: formData.get("programId"),
    nameEn: formData.get("nameEn"),
    nameKn: formData.get("nameKn") ?? "",
    descEn: formData.get("descEn") ?? "",
    descKn: formData.get("descKn") ?? "",
    sequence: formData.get("sequence") ?? "",
    hours: formData.get("hours") ?? "",
  };
}
