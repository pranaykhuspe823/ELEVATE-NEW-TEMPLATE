const BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "c5-fpc-token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error("Can't reach the server. Check your connection and try again.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  if (!res.ok) {
    if (res.status === 401) setToken(null);
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  start: (payload) => request("/auth/start", { method: "POST", body: payload, auth: false }),

  getProgress: () => request("/progress"),
  putProgress: (payload) => request("/progress", { method: "PUT", body: payload }),

  examStatus: () => request("/exam/status"),
  examStart: () => request("/exam/start", { method: "POST" }),
  examSubmit: (payload) => request("/exam/submit", { method: "POST", body: payload }),

  getCertificate: () => request("/certificate"),
  putCertificate: (payload) => request("/certificate", { method: "PUT", body: payload }),

  verifyCertificate: (id) => request(`/verify/${encodeURIComponent(id)}`, { auth: false }),

  adminFaculty: () => request("/admin/faculty"),
};
