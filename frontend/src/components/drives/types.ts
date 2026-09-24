export type DriveStatus = "upcoming" | "completed";

export interface Drive {
  id: string;
  companyName: string;
  roleTitle: string;
  description: string;
  skills: string[];
  driveDate: string | null;
  location: string | null;
  ctc: string | null;
  status: DriveStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FitSummary {
  score: number;
  matched: string[];
  missing: string[];
}

export interface DriveWithFit extends Drive {
  fit: FitSummary | null;
}

export interface Tips {
  gaps: { skill: string; advice: string }[];
  resumeTips: string[];
}

export interface DriveFit extends FitSummary {
  tips: Tips | null;
}

export interface DriveListResponse {
  linked: boolean;
  hasResume: boolean;
  fitError?: boolean;
  drives: DriveWithFit[];
}

export interface ReadinessStudent {
  id: string;
  name: string | null;
  email: string;
  score: number;
  matched: string[];
  missing: string[];
}

export interface ReadinessSummary {
  totalStudents: number;
  withResume: number;
  withoutResume: number;
  averageScore: number | null;
  buckets: { strong: number; partial: number; low: number };
  topGaps: { skill: string; missingCount: number; percent: number }[];
}

export interface ReadinessResponse {
  drive: Drive;
  summary: ReadinessSummary;
  /** Faculty get their own students one by one; the TPO gets `null`. */
  students: ReadinessStudent[] | null;
}

export interface DriveInput {
  companyName: string;
  roleTitle: string;
  description: string;
  requiredSkills: string[];
  driveDate: string | null;
  location: string | null;
  ctc: string | null;
  status: DriveStatus;
}

// --- fit helpers ---------------------------------------------------------------

export type FitTone = "strong" | "partial" | "low";

/** Same cut-offs the API uses for the readiness buckets. */
export function fitTone(score: number): FitTone {
  if (score >= 70) return "strong";
  if (score >= 40) return "partial";
  return "low";
}

export const FIT_LABEL: Record<FitTone, string> = {
  strong: "Strong fit",
  partial: "Partial fit",
  low: "Needs work",
};

export const FIT_BAR: Record<FitTone, string> = {
  strong: "bg-teal",
  partial: "bg-amber",
  low: "bg-coral",
};

export const FIT_TEXT: Record<FitTone, string> = {
  strong: "text-teal",
  partial: "text-amber",
  low: "text-coral",
};

// --- date helpers --------------------------------------------------------------
// A drive date is a calendar day stored at noon UTC, so it's read back in UTC
// (rather than the viewer's timezone) to always show the same day.

const DAY_MS = 86_400_000;

function utcDay(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Whole days from today (the viewer's local date) to the drive; negative if past. */
export function daysUntil(iso: string): number {
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((utcDay(iso) - today) / DAY_MS);
}

export function formatDriveDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Today", "Tomorrow", "In 5 days" -- or null when the drive is over/undated. */
export function countdown(drive: Pick<Drive, "driveDate" | "status">): string | null {
  if (drive.status === "completed" || !drive.driveDate) return null;
  const days = daysUntil(drive.driveDate);
  if (days < 0) return "Date passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function dateInputValue(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

export function companyInitial(name: string): string {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function skillSummary(skills: string[], limit: number) {
  return { shown: skills.slice(0, limit), extra: Math.max(0, skills.length - limit) };
}
