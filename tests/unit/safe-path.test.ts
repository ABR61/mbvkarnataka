import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/safe-path";

describe("safeInternalPath", () => {
  it("keeps normal same-site paths (with query strings)", () => {
    expect(safeInternalPath("/en/admin")).toBe("/en/admin");
    expect(safeInternalPath("/en/checkin?s=1&k=2.abc")).toBe("/en/checkin?s=1&k=2.abc");
  });
  it("rejects anything that browsers treat as another site", () => {
    for (const bad of ["//evil.com", "//evil.com/x", "/\\evil.com", "https://evil.com", "evil.com", "/\tevil", "/\n/evil.com", "", null, undefined]) {
      expect(safeInternalPath(bad as string)).toBeUndefined();
    }
  });
});
