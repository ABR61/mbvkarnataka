import { z } from "zod";

export const districtInput = z.object({
  nameEn: z.string().trim().min(1, "required"),
  nameKn: z.string().trim().optional().default(""),
  code: z.string().trim().optional().default(""),
  state: z.string().trim().min(1, "required"),
});

export type DistrictInput = z.infer<typeof districtInput>;

export function districtFromForm(formData: FormData) {
  return {
    nameEn: formData.get("nameEn"),
    nameKn: formData.get("nameKn") ?? "",
    code: formData.get("code") ?? "",
    state: formData.get("state") ?? "Karnataka",
  };
}
