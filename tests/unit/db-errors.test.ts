import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { isUniqueViolationOn } from "@/lib/db-errors";

const known = (code: string, meta: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("db error", {
    code,
    clientVersion: "test",
    meta,
  });

describe("isUniqueViolationOn", () => {
  it("detects the pg driver-adapter shape (captured from a real duplicate)", () => {
    const e = known("P2002", {
      modelName: "Cohort",
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: {
          originalCode: "23505",
          kind: "UniqueConstraintViolation",
          constraint: { fields: ["code"] },
        },
      },
    });
    expect(isUniqueViolationOn(e, "code")).toBe(true);
    expect(isUniqueViolationOn(e, "email")).toBe(false);
  });

  it("detects the classic meta.target shape (array or string)", () => {
    expect(isUniqueViolationOn(known("P2002", { target: ["code"] }), "code")).toBe(true);
    expect(isUniqueViolationOn(known("P2002", { target: "code" }), "code")).toBe(true);
  });

  it("does not treat other database errors as a duplicate", () => {
    // Foreign-key failure and record-not-found must surface as real errors.
    expect(isUniqueViolationOn(known("P2003", { field_name: "programId" }), "code")).toBe(false);
    expect(isUniqueViolationOn(known("P2025", {}), "code")).toBe(false);
    expect(isUniqueViolationOn(new Error("connection refused"), "code")).toBe(false);
    expect(isUniqueViolationOn(null, "code")).toBe(false);
  });
});
