export const BASE = import.meta.env.VITE_API_URL || '/api';
const KEY = 'c5e_token';

export const getToken = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
export const setToken = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage blocked */ } };

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  return res;
}

export async function api(path, opts) {
  const res = await request(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || 'Request failed. Try again.'); e.status = res.status; throw e; }
  return data;
}

export async function download(path, filename) {
  const res = await request(path);
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Download failed. Try again.'); }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Save a course badge as a PNG (for LinkedIn and other profiles), drawn from its SVG at high resolution. */
export async function downloadBadge(slug, filename) {
  const svg = await (await fetch(`${BASE}/badges/${slug}.svg?v=5`)).text();
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  await img.decode();
  const canvas = Object.assign(document.createElement('canvas'), { width: 720, height: 840 });
  canvas.getContext('2d').drawImage(img, 0, 0, 720, 840);
  URL.revokeObjectURL(img.src);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
