import "server-only";

/**
 * Rate-limit thresholds per protected surface. Each is env-tunable so ops can
 * tighten or loosen without a code change; the defaults are deliberately
 * generous enough not to hurt real users on shared/branch-office IPs.
 */
function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const RATE_LIMITS = {
  /** Credential sign-in: per email+IP. Only failed attempts count. */
  login: {
    limit: num("RATE_LIMIT_LOGIN_MAX", 5),
    windowSec: num("RATE_LIMIT_LOGIN_WINDOW_SEC", 15 * 60),
  },
  /** Public application submissions: per IP. */
  apply: {
    limit: num("RATE_LIMIT_APPLY_MAX", 5),
    windowSec: num("RATE_LIMIT_APPLY_WINDOW_SEC", 60 * 60),
  },
  /** Certificate verification lookups: per IP (stops serial enumeration). */
  verify: {
    limit: num("RATE_LIMIT_VERIFY_MAX", 20),
    windowSec: num("RATE_LIMIT_VERIFY_WINDOW_SEC", 60),
  },
  /** WebAuthn register/authenticate endpoints: per IP. */
  webauthn: {
    limit: num("RATE_LIMIT_WEBAUTHN_MAX", 10),
    windowSec: num("RATE_LIMIT_WEBAUTHN_WINDOW_SEC", 60),
  },
} as const;
