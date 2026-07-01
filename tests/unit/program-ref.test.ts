import { describe, it, expect } from "vitest";
import { parseProgramRef } from "@/lib/program-ref";

// The select value decides which table a completion writes to, so a malformed
// or spoofed ref must never resolve to a valid kind.
describe("parseProgramRef", () => {
  it("parses a training ref", () => {
    expect(parseProgramRef("training:abc123")).toEqual({ kind: "training", id: "abc123" });
  });

  it("parses a future ref", () => {
    expect(parseProgramRef("future:xyz789")).toEqual({ kind: "future", id: "xyz789" });
  });

  it("rejects an unknown kind", () => {
    expect(parseProgramRef("evil:abc")).toBeNull();
  });

  it("rejects a missing id", () => {
    expect(parseProgramRef("training:")).toBeNull();
    expect(parseProgramRef("training")).toBeNull();
  });

  it("rejects empty / nullish input", () => {
    expect(parseProgramRef("")).toBeNull();
    expect(parseProgramRef(null)).toBeNull();
    expect(parseProgramRef(undefined)).toBeNull();
  });
});
