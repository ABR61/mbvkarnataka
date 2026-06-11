// Moodle Web Services client. The app is the system of record; this provisions
// enrolments to Moodle and reads completion back.
//
// NOT server-only: the pure request-shaping helpers are unit-tested. The network
// methods need a live, configured Moodle (MOODLE_URL + MOODLE_TOKEN) and are not
// verified in this dev environment.

export type MoodleConfig = { url: string; token: string };

/** Returns config if both env vars are set, else null. */
export function moodleConfig(): MoodleConfig | null {
  const url = process.env.MOODLE_URL?.trim();
  const token = process.env.MOODLE_TOKEN?.trim();
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function isMoodleConfigured(): boolean {
  return moodleConfig() !== null;
}

/** The REST endpoint URL for a given web-service function. */
export function buildMoodleUrl(
  baseUrl: string,
  token: string,
  wsfunction: string,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  const qs = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: "json",
  });
  return `${base}/webservice/rest/server.php?${qs.toString()}`;
}

/**
 * Flatten a nested params object into Moodle's bracketed form-encoding, e.g.
 * { enrolments: [{ roleid: 5, userid: 2 }] }
 *   → [["enrolments[0][roleid]","5"], ["enrolments[0][userid]","2"]]
 * Undefined/null values are dropped. Booleans become "1"/"0".
 */
export function flattenMoodleParams(
  input: unknown,
  prefix = "",
): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const walk = (val: unknown, key: string): void => {
    if (val === undefined || val === null) return;
    if (Array.isArray(val)) {
      val.forEach((v, i) => walk(v, key ? `${key}[${i}]` : String(i)));
    } else if (typeof val === "object") {
      for (const [k, v] of Object.entries(val)) {
        walk(v, key ? `${key}[${k}]` : k);
      }
    } else if (typeof val === "boolean") {
      out.push([key, val ? "1" : "0"]);
    } else {
      out.push([key, String(val)]);
    }
  };
  walk(input, prefix);
  return out;
}

/** Params for enrolling a user into a course (manual enrolment, Student role). */
export const MOODLE_STUDENT_ROLE_ID = 5;
export function moodleEnrolRequest(
  courseid: number,
  userid: number,
  roleid: number = MOODLE_STUDENT_ROLE_ID,
) {
  return { enrolments: [{ roleid, userid, courseid }] };
}

class MoodleError extends Error {}

async function call<T>(wsfunction: string, params: unknown): Promise<T> {
  const cfg = moodleConfig();
  if (!cfg) throw new MoodleError("Moodle is not configured");

  const url = buildMoodleUrl(cfg.url, cfg.token, wsfunction);
  const body = new URLSearchParams(flattenMoodleParams(params));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as T & { exception?: string; message?: string };
  if (data && typeof data === "object" && "exception" in data && data.exception) {
    throw new MoodleError(data.message ?? "Moodle request failed");
  }
  return data;
}

// Network methods (need a live Moodle).
export const moodle = {
  getCourses: () =>
    call<Array<{ id: number; shortname: string; fullname: string }>>(
      "core_course_get_courses",
      {},
    ),
  findUserByEmail: (email: string) =>
    call<Array<{ id: number; email: string }>>("core_user_get_users_by_field", {
      field: "email",
      values: [email],
    }),
  enrolUser: (courseid: number, userid: number, roleid?: number) =>
    call<null>("enrol_manual_enrol_users", moodleEnrolRequest(courseid, userid, roleid)),
  getCompletion: (courseid: number, userid: number) =>
    call<{ completionstatus?: { completed: boolean } }>(
      "core_completion_get_course_completion_status",
      { courseid, userid },
    ),
};
