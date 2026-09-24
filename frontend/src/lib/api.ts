import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000",
  withCredentials: true,
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
