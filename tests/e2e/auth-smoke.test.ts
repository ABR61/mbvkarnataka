import { describe, it, expect } from "vitest";

// End-to-end smoke against a running server (real middleware → auth → RBAC →
// RSC render). Set BASE_URL; relies on the seeded admin (admin@mbv.local).
const BASE = process.env.BASE_URL || "http://localhost:3000";
const ADMIN_EMAIL = "admin@mbv.local";
const ADMIN_PASSWORD = "ChangeMe123!";

type Jar = Map<string, string>;

function storeCookies(jar: Jar, res: Response): void {
  // Node 20+ exposes getSetCookie() for multiple Set-Cookie headers.
  const cookies: string[] =
    (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
    [];
  for (const c of cookies) {
    const pair = c.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (value) jar.set(name, value);
    else jar.delete(name);
  }
}

const cookieHeader = (jar: Jar) =>
  [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

const hasSession = (jar: Jar) =>
  [...jar.keys()].some((k) => k.includes("session-token"));

async function login(jar: Jar, email: string, password: string): Promise<void> {
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`);
  storeCookies(jar, csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: new URLSearchParams({ csrfToken, email, password }),
    redirect: "manual",
  });
  storeCookies(jar, res);
}

describe("auth + routing smoke", () => {
  it("redirects anonymous users from /admin to sign-in", async () => {
    const res = await fetch(`${BASE}/en/admin`, { redirect: "manual" });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("renders the sign-in page with a credentials form", async () => {
    const res = await fetch(`${BASE}/en/sign-in`);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
  });

  it("signs in the admin and renders the dashboard", async () => {
    const jar: Jar = new Map();
    await login(jar, ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(hasSession(jar)).toBe(true);

    const dash = await fetch(`${BASE}/en/admin`, {
      headers: { Cookie: cookieHeader(jar) },
    });
    expect(dash.status).toBe(200);
    expect(await dash.text()).toContain("MBV Admin");
  });

  it("rejects a wrong password (no session cookie)", async () => {
    const jar: Jar = new Map();
    await login(jar, ADMIN_EMAIL, "definitely-wrong");
    expect(hasSession(jar)).toBe(false);
  });
});
