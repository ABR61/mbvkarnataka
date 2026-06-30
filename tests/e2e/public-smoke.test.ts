import { describe, it, expect } from "vitest";

// The public marketing site is open to everyone; only /admin requires sign-in.
const BASE = process.env.BASE_URL || "http://localhost:3000";

async function getHtml(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, html: await res.text() };
}

async function redirectTarget(path: string): Promise<{ status: number; location: string | null }> {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  return { status: res.status, location: res.headers.get("location") };
}

describe("public site", () => {
  it("serves the home page to everyone (no login)", async () => {
    const { status, html } = await getHtml("/en");
    expect(status).toBe(200);
    expect(html).toContain("Manava Bandhutva Vedike");
  });

  it("serves the programs listing without login", async () => {
    const { status, html } = await getHtml("/en/programs");
    expect(status).toBe(200);
    expect(html).toContain("Training programs");
  });

  it("shows a Login link in the header when signed out", async () => {
    const { html } = await getHtml("/en");
    expect(html).toMatch(/>Login</);
  });

  it("still gates the admin area behind sign-in", async () => {
    const { status, location } = await redirectTarget("/en/admin");
    expect(status).toBeGreaterThanOrEqual(300);
    expect(status).toBeLessThan(400);
    expect(location).toContain("/sign-in");
  });
});
