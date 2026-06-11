import { describe, it, expect } from "vitest";
import { z } from "zod";
import { zodFieldErrors } from "@/lib/forms";

const schema = z.object({
  name: z.string().min(1, "required"),
  email: z.email("invalid"),
});

describe("zodFieldErrors", () => {
  it("collapses a ZodError to first-message-per-field", () => {
    const result = schema.safeParse({ name: "", email: "nope" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(zodFieldErrors(result.error)).toEqual({
        name: "required",
        email: "invalid",
      });
    }
  });

  it("keeps only the first error for a field", () => {
    const s = z.object({
      pw: z.string().min(8, "too-short").regex(/[0-9]/, "needs-number"),
    });
    const result = s.safeParse({ pw: "ab" });
    if (!result.success) {
      expect(zodFieldErrors(result.error).pw).toBe("too-short");
    }
  });
});
