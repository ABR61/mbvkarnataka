import { describe, it, expect } from "vitest";

// Smoke for the public marketing + admissions surface (GET-only, seed-agnostic).
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function getHtml(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, html: await res.text() };
}

describe("public site smoke", () => {
  it("renders the home page with primary CTAs", async () => {
    const { status, html } = await getHtml("/en");
    expect(status).toBe(200);
    expect(html).toContain("Manava Bandhutva Vedike");
    expect(html).toMatch(/Browse programs|Apply now/);
  });

  it("renders the programs listing", async () => {
    const { status, html } = await getHtml("/en/programs");
    expect(status).toBe(200);
    expect(html).toContain("Training programs");
  });

  it("renders the programs listing in Kannada", async () => {
    const { status, html } = await getHtml("/kn/programs");
    expect(status).toBe(200);
    expect(html).toContain("ತರಬೇತಿ ಕಾರ್ಯಕ್ರಮಗಳು");
  });

  it("renders the public application form", async () => {
    const { status, html } = await getHtml("/en/apply");
    expect(status).toBe(200);
    expect(html).toContain('name="firstName"');
    expect(html).toContain('name="phone"');
    expect(html).toContain('name="consent"');
  });
});
