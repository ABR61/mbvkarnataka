// Pure attendance-integrity rules (no database, no server-only imports) so they
// can be unit-tested and shared by server code and pages.

import { todayISO } from "@/lib/dates";

/** How far (metres) the marking phone may be from the center before the
 *  session is flagged. GPS indoors is often off by 100 m+, so this is generous;
 *  the reported accuracy is also subtracted before comparing. */
export const LOCATION_RADIUS_M = Number(process.env.ATTENDANCE_RADIUS_M) || 500;

/** Days after the session day on which marking is still allowed (0 = only on
 *  the session day itself). After that, changes need an approved correction. */
export const MARKING_GRACE_DAYS = Number(process.env.ATTENDANCE_GRACE_DAYS) || 0;

export type MarkingWindow = "notYet" | "open" | "locked";

/** Session dates are stored as UTC midnight of the calendar day. */
const dayISO = (d: Date) => d.toISOString().slice(0, 10);

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return dayISO(d);
}

/**
 * Whether attendance for a session can be marked right now (India date):
 * not before the session day, and not after the session day + grace.
 */
export function markingWindow(
  sessionDate: Date,
  now: Date = new Date(),
  graceDays: number = MARKING_GRACE_DAYS,
): MarkingWindow {
  const today = todayISO(now);
  const day = dayISO(sessionDate);
  if (today < day) return "notYet";
  if (today > addDays(day, graceDays)) return "locked";
  return "open";
}

/** Great-circle distance in metres (haversine). */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type AttendanceSummary = {
  held: number; // sessions that have been marked
  attended: number; // present or late
  excused: number;
  absent: number; // absent, or no record for a held session
  pct: number | null; // attended / (held − excused); null when nothing to measure
};

/**
 * A trainee's attendance over a cohort's held sessions. Only sessions that
 * have actually been marked count — an unmarked session isn't held against
 * the trainee (it's flagged separately as a missing record). Excused absences
 * are removed from the denominator.
 */
export function summarizeAttendance(
  heldSessionIds: readonly string[],
  rows: readonly { sessionId: string; status: string }[],
): AttendanceSummary {
  const bySession = new Map(rows.map((r) => [r.sessionId, r.status]));
  let attended = 0;
  let excused = 0;
  for (const id of heldSessionIds) {
    const s = bySession.get(id);
    if (s === "PRESENT" || s === "LATE") attended++;
    else if (s === "EXCUSED") excused++;
  }
  return summaryFromCounts(heldSessionIds.length, attended, excused);
}

/** The same summary from pre-aggregated counts (e.g. a SQL GROUP BY) — the one
 *  place the percentage formula lives, so both paths always agree. */
export function summaryFromCounts(held: number, attended: number, excused: number): AttendanceSummary {
  const denom = held - excused;
  return {
    held,
    attended,
    excused,
    absent: held - attended - excused,
    pct: denom > 0 ? Math.round((attended / denom) * 100) : null,
  };
}

/** True when a known percentage is under the program's minimum. */
export const isBelowMinimum = (pct: number | null, min: number) => pct !== null && pct < min;

export type SessionFlag = "noPhoto" | "noLocation" | "farFromCenter" | "centerNotMapped";

/** Evidence gaps for a session whose attendance has been marked. */
export function sessionFlags(s: {
  photoUrl: string | null;
  markedLat: number | null;
  markedDistanceM: number | null;
  centerMapped: boolean;
  radiusM?: number;
}): SessionFlag[] {
  const flags: SessionFlag[] = [];
  if (!s.photoUrl) flags.push("noPhoto");
  if (s.markedLat == null) flags.push("noLocation");
  else if (!s.centerMapped) flags.push("centerNotMapped");
  else if (s.markedDistanceM != null && s.markedDistanceM > (s.radiusM ?? LOCATION_RADIUS_M)) {
    flags.push("farFromCenter");
  }
  return flags;
}

const toMinutes = (hhmm: string | null) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Trainees marked present/late in two different sessions on the same day that
 * couldn't both be true: at different centers, or with overlapping times.
 * (Sessions without times at the same center are assumed sequential.)
 */
export function findDoubleBookings(
  rows: readonly {
    personId: string;
    sessionId: string;
    date: string; // YYYY-MM-DD
    centerId: string;
    startTime: string | null;
    endTime: string | null;
  }[],
): { personId: string; date: string; sessionIds: [string, string] }[] {
  const groups = new Map<string, typeof rows[number][]>();
  for (const r of rows) {
    const key = `${r.personId}|${r.date}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const out: { personId: string; date: string; sessionIds: [string, string] }[] = [];
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.sessionId === b.sessionId) continue;
        const differentCenter = a.centerId !== b.centerId;
        const as = toMinutes(a.startTime), ae = toMinutes(a.endTime);
        const bs = toMinutes(b.startTime), be = toMinutes(b.endTime);
        const overlap =
          as !== null && ae !== null && bs !== null && be !== null && as < be && bs < ae;
        if (differentCenter || overlap) {
          out.push({ personId: a.personId, date: a.date, sessionIds: [a.sessionId, b.sessionId] });
        }
      }
    }
  }
  return out;
}
