import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
  withCredentials: true,
});

export interface PlanBlock {
  /** PLAN_REQUIRED: the college admin must buy a plan. ORG_PLAN_EXPIRED:
   * faculty / students of a college whose plan has ended. */
  code: "PLAN_REQUIRED" | "ORG_PLAN_EXPIRED";
  error: string;
}

export const PLAN_BLOCK_EVENT = "elevate:plan-block";

// Any 402 with a plan code (the trial ended mid-session, say) is announced
// app-wide; AuthProvider picks it up and the layout locks accordingly.
api.interceptors.response.use(undefined, (error) => {
  const data = error?.response?.data;
  if (
    error?.response?.status === 402 &&
    (data?.code === "PLAN_REQUIRED" || data?.code === "ORG_PLAN_EXPIRED")
  ) {
    window.dispatchEvent(new CustomEvent<PlanBlock>(PLAN_BLOCK_EVENT, { detail: data }));
  }
  return Promise.reject(error);
});

/** Turns a path the API returns (like an uploaded avatar) into a full URL.
 * Absolute URLs -- e.g. a Google profile photo -- pass through unchanged. */
export function assetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${api.defaults.baseURL}${path}`;
}

export async function uploadResume(file: File): Promise<{ resumeId: string }> {
  const formData = new FormData();
  formData.append("resume", file);
  const { data } = await api.post("/api/resumes/upload", formData);
  return data;
}
