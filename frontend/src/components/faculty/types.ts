import axios from "axios";

export interface WeakTopic {
  topic: string;
  correct: number;
  total: number;
}

export interface FacultyWeakTopic {
  id: string;
  topic: string;
  note: string | null;
}

export interface SuggestedModule {
  id: string;
  title: string;
  topic: string;
  priority: string;
  estimatedHours: number;
}

export interface Assignment {
  id: string;
  title: string;
  topic: string;
  priority: string;
  estimatedHours: number;
  reason: string | null;
  status: string;
  createdAt: string;
}

export interface StudentDetail {
  student: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  atsScore: number | null;
  detectedField: string | null;
  plagiarismScore: number | null;
  plagiarismThreshold: number;
  resumeUploadedAt: string | null;
  weakTopics: WeakTopic[];
  facultyWeakTopics: FacultyWeakTopic[];
  suggestedModules: SuggestedModule[];
  assignments: Assignment[];
}

export interface PlagiarismMatch {
  id: string;
  reviewStatus: string;
  facultyNote: string | null;
  similarityScore: number;
  source: string;
  matchedStudentName: string | null;
  explanation: string | null;
  overlap: { yours: string; theirs: string; similarity: number }[];
  redacted: boolean;
}

export interface CourseSearchResult {
  provider: string;
  kind: "learning path" | "module" | "video" | "playlist";
  title: string;
  url: string;
  description: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
}

export interface CourseSearchResponse {
  results: CourseSearchResult[];
  youtubeEnabled: boolean;
  searchLinks: { platform: string; url: string }[];
}

export const PRIORITIES = ["high", "medium", "low"] as const;

export const inputClass =
  "text-[15px] text-text px-3.5 py-2.5 rounded-xl border border-border bg-white placeholder:text-text-3 focus:outline-none focus:shadow-sm transition";

export function errorMessage(err: unknown, fallback: string) {
  return axios.isAxiosError(err) && err.response?.data?.error
    ? (err.response.data.error as string)
    : fallback;
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.round((minutes / 60) * 10) / 10} h`;
}

export function initials(name: string | null, email: string) {
  const source = (name ?? email).trim();
  const parts = source.split(/[\s@._-]+/).filter(Boolean);
  const letters =
    parts.length >= 2 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

export function firstName(name: string | null, email: string) {
  return (name ?? email).trim().split(/\s+/)[0];
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
