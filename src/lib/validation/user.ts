import { z } from "zod";

export const USER_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type UserStatusValue = (typeof USER_STATUSES)[number];

const localeField = z.enum(["en", "kn"]).default("en");

export const userCreateInput = z.object({
  email: z.email("invalid"),
  name: z.string().trim().min(1, "required"),
  password: z.string().min(8, "min8"),
  locale: localeField,
});

export const userUpdateInput = z.object({
  name: z.string().trim().min(1, "required"),
  status: z.enum(USER_STATUSES),
  locale: localeField,
});

export type UserCreateInput = z.infer<typeof userCreateInput>;
export type UserUpdateInput = z.infer<typeof userUpdateInput>;
