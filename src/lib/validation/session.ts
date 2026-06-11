import { z } from "zod";

const optionalStr = z.string().trim().optional().default("");
const timeField = z
  .union([z.literal(""), z.string().regex(/^\d{2}:\d{2}$/, "time")])
  .optional()
  .default("");

export const SESSION_STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED"] as const;
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const sessionInput = z.object({
  cohortId: z.string().trim().min(1, "required"),
  courseId: z.string().trim().min(1, "required"),
  venueId: optionalStr,
  trainerId: optionalStr,
  sessionDate: z.string().trim().min(1, "required"), // YYYY-MM-DD
  startTime: timeField, // HH:mm
  endTime: timeField,
  topicEn: optionalStr,
  topicKn: optionalStr,
  status: z.enum(SESSION_STATUSES),
});

export type SessionInput = z.infer<typeof sessionInput>;

export function sessionFromForm(formData: FormData) {
  return {
    cohortId: formData.get("cohortId"),
    courseId: formData.get("courseId"),
    venueId: formData.get("venueId") ?? "",
    trainerId: formData.get("trainerId") ?? "",
    sessionDate: formData.get("sessionDate"),
    startTime: formData.get("startTime") ?? "",
    endTime: formData.get("endTime") ?? "",
    topicEn: formData.get("topicEn") ?? "",
    topicKn: formData.get("topicKn") ?? "",
    status: formData.get("status"),
  };
}

export function isAttendanceStatus(v: unknown): v is AttendanceStatus {
  return (
    typeof v === "string" &&
    (ATTENDANCE_STATUSES as readonly string[]).includes(v)
  );
}
