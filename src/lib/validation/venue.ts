import { z } from "zod";

const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(0).nullable(),
);

// Venue names are plain strings (room/hall labels), not localized.
export const venueInput = z.object({
  name: z.string().trim().min(1, "required"),
  centerId: z.string().trim().min(1, "required"),
  capacity: optionalInt,
});

export type VenueInput = z.infer<typeof venueInput>;

export function venueFromForm(formData: FormData) {
  return {
    name: formData.get("name"),
    centerId: formData.get("centerId"),
    capacity: formData.get("capacity") ?? "",
  };
}
