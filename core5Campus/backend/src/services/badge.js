// Course badge: a shield with the Core5Campus name, a layered emblem in the course colour,
// "CERTIFIED", the course name and code. One SVG used on the site, in the certificate PDF and for PNG download.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courses } from '../data/catalog.js';

export const ASSETS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../assets');

const GREEN = '#12372A';
const DEEP = '#0B2A1F';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));


export function badgeFor(slug) {
  const c = courses.find((x) => x.slug === slug);
  if (!c) return null;
  return { lines: c.badge?.lines || [c.title], icon: c.badge?.icon || 'board', code: c.cert_prefix || '' };
}

// Course icons, drawn in gold on a 48x48 grid
const ICONS = {
  // classroom board with a ticked lesson
  board: '<rect x="5" y="7" width="38" height="25" rx="3"/><path d="M14 20l5 5 10-11"/><path d="M17 32l-5 10M31 32l5 10M24 32v6"/>',
  // presenter at a board
  trainer: '<circle cx="11" cy="13" r="5"/><path d="M3 41v-9a8 8 0 0 1 16 0v9"/><rect x="24" y="6" width="20" height="16" rx="2"/><path d="M28 12h12M28 17h8M17 25l9-5"/>',
  // AI chip with sparkles
  ai: '<rect x="13" y="13" width="22" height="22" rx="4"/><path d="M19 13V7M29 13V7M19 41v-6M29 41v-6M13 19H7M13 29H7M41 19h-6M41 29h-6"/><path d="M19 29l3-10h2l3 10M20 26h6M30.5 19v10" stroke-width="2.6"/>',
  // team with a lightbulb idea
  leader: '<path d="M24 3a6 6 0 0 0-3 11v3h6v-3a6 6 0 0 0-3-11z"/><circle cx="12" cy="26" r="4.5"/><circle cx="36" cy="26" r="4.5"/><circle cx="24" cy="24" r="5"/><path d="M4 43v-3a8 8 0 0 1 14-5M44 43v-3a8 8 0 0 0-14-5M15 44v-4a9 9 0 0 1 18 0v4"/>',
  // laptop playing a lesson
  online: '<rect x="8" y="8" width="32" height="22" rx="2.5"/><path d="M3 36h42l-3 5H6z"/><path d="M21 14v10l8-5z" fill="#F5B301"/>',
};

const GOOGLE_G = '<circle cx="120" cy="107" r="27" fill="#FFFFFF"/><circle cx="120" cy="107" r="27" fill="none" stroke="#E9A200" stroke-width="1.5"/>'
  + '<g transform="translate(102 89) scale(.75)">'
  + '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
  + '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
  + '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>'
  + '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>'
  + '</g>';

export function badgeSvg({ lines, icon }) {
  const size = lines.length > 2 ? 19 : 21;
  const top = lines.length > 2 ? 163 : 172;
  const textLines = lines.map((l, i) => `<text x="121.5" y="${top + 1.5 + i * (size + 3)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="${size}" fill="#000000" fill-opacity=".4">${esc(l)}</text><text x="120" y="${top + i * (size + 3)}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="${size}" fill="#FFFFFF">${esc(l)}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 280" width="240" height="280">
  <defs>
    <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE38A"/><stop offset=".35" stop-color="#F5B301"/><stop offset=".7" stop-color="#C98A00"/><stop offset="1" stop-color="#FFD24D"/></linearGradient>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A86F00"/><stop offset="1" stop-color="#7A5000"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1D5A42"/><stop offset=".55" stop-color="${GREEN}"/><stop offset="1" stop-color="${DEEP}"/></linearGradient>
    <linearGradient id="bevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFF6D0"/><stop offset=".45" stop-color="#FFE08A" stop-opacity=".2"/><stop offset=".55" stop-color="#7A5000" stop-opacity=".2"/><stop offset="1" stop-color="#6B4500"/></linearGradient>
    <linearGradient id="inner" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7A5000"/><stop offset="1" stop-color="#FFE38A"/></linearGradient>
    <linearGradient id="hshade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000000" stop-opacity=".35"/><stop offset="1" stop-color="#000000" stop-opacity="0"/></linearGradient>
    <radialGradient id="facelight" cx=".3" cy=".25" r=".9"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".14"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>
    <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".55"/><stop offset=".4" stop-color="#FFFFFF" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="M30 6 H210 Q234 6 234 30 V196 Q234 208 223 215 L131 272 Q120 279 109 272 L17 215 Q6 208 6 196 V30 Q6 6 30 6 Z" fill="url(#edge)"/>
  <path d="M30 4 H210 Q232 4 232 26 V193 Q232 205 222 211 L130 268 Q120 274 110 268 L18 211 Q8 205 8 193 V26 Q8 4 30 4 Z" fill="url(#rim)"/>
  <path d="M30 5.5 H210 Q230.5 5.5 230.5 26 V193 Q230.5 204 221 209.7 L129.3 266.6 Q120 272 110.7 266.6 L19 209.7 Q9.5 204 9.5 193 V26 Q9.5 5.5 30 5.5 Z" fill="none" stroke="url(#bevel)" stroke-width="3"/>
  <path d="M33 15 H207 Q221 15 221 29 V189 Q221 200 212 205.5 L128 258 Q120 262.5 112 258 L28 205.5 Q19 200 19 189 V29 Q19 15 33 15 Z" fill="url(#inner)"/>
  <path d="M34 18 H206 Q218 18 218 30 V188 Q218 198 210 203 L127 255 Q120 259 113 255 L30 203 Q22 198 22 188 V30 Q22 18 34 18 Z" fill="url(#body)"/>
  <path d="M34 18 H206 Q218 18 218 30 V188 Q218 198 210 203 L127 255 Q120 259 113 255 L30 203 Q22 198 22 188 V30 Q22 18 34 18 Z" fill="url(#facelight)"/>
  <path d="M34 18 H206 Q218 18 218 30 V70 H22 V30 Q22 18 34 18 Z" fill="#FFFFFF"/>
  <rect x="22" y="70" width="196" height="9" fill="url(#hshade)"/>
  <text x="120" y="54" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="bold" font-size="27"><tspan fill="${GREEN}">Core5</tspan><tspan fill="#E9A200">Campus</tspan></text>
${icon === 'google' ? GOOGLE_G : `  <g transform="translate(89.5 78) scale(1.33)" fill="none" stroke="#000000" stroke-opacity=".35" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ICONS.board}</g>
  <g transform="translate(88 76) scale(1.33)" fill="none" stroke="#F5B301" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ICONS.board}</g>`}
  ${textLines}
  <path d="M120 222 l4.4 9 9.9 1.4 -7.2 7 1.7 9.9 -8.8 -4.7 -8.8 4.7 1.7 -9.9 -7.2 -7 9.9 -1.4 z" fill="#F5B301" stroke="#FFE38A" stroke-width="1"/>
  <path d="M30 4 H210 Q232 4 232 26 V60 Q150 30 8 110 V26 Q8 4 30 4 Z" fill="url(#shine)" opacity=".5"/>
</svg>`;
}
