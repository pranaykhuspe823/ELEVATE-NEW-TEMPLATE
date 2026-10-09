export const ASSIGNMENT_STATUSES = ["assigned", "in_progress", "completed"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export function isAssignmentStatus(value: unknown): value is AssignmentStatus {
  return (ASSIGNMENT_STATUSES as readonly unknown[]).includes(value);
}

export function isProgressPercent(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

export function statusForProgress(percent: number): AssignmentStatus {
  if (percent >= 100) return "completed";
  return percent > 0 ? "in_progress" : "assigned";
}

/** Setting a status by hand drags progress along: done is 100%, not started
 * is 0%, and reopening a finished course drops it back under 100. */
export function progressForStatus(status: AssignmentStatus, current: number): number {
  if (status === "completed") return 100;
  if (status === "assigned") return 0;
  return Math.min(current, 99);
}
