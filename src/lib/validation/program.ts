import { z } from "zod";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(0).nullable(),
);

export const programInput = z.object({
  nameEn: z.string().trim().min(1, "required"),
  nameKn: z.string().trim().optional().default(""),
  descEn: z.string().trim().optional().default(""),
  descKn: z.string().trim().optional().default(""),
  category: z.string().trim().optional().default(""),
  durationWeeks: optionalInt,
  status: z.enum(["active", "inactive"]),
});

export type ProgramInput = z.infer<typeof programInput>;

export function programFromForm(formData: FormData) {
  return {
    nameEn: formData.get("nameEn"),
    nameKn: formData.get("nameKn") ?? "",
    descEn: formData.get("descEn") ?? "",
    descKn: formData.get("descKn") ?? "",
    category: formData.get("category") ?? "",
    durationWeeks: formData.get("durationWeeks") ?? "",
    status: formData.get("status"),
  };
}
