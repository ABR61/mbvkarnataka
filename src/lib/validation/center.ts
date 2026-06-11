import { z } from "zod";

// Center form input. `nameEn` is required (the canonical name); Kannada is optional.
export const centerInput = z.object({
  nameEn: z.string().trim().min(1, "required"),
  nameKn: z.string().trim().optional().default(""),
  districtId: z.string().trim().min(1, "required"),
  address: z.string().trim().optional().default(""),
  contactPhone: z.string().trim().optional().default(""),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type CenterInput = z.infer<typeof centerInput>;

/** Pull center fields out of submitted FormData for safeParse. */
export function centerFromForm(formData: FormData) {
  return {
    nameEn: formData.get("nameEn"),
    nameKn: formData.get("nameKn") ?? "",
    districtId: formData.get("districtId"),
    address: formData.get("address") ?? "",
    contactPhone: formData.get("contactPhone") ?? "",
    status: formData.get("status"),
  };
}
