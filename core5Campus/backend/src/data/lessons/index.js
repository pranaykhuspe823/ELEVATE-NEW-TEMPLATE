// Lesson content for each course: one lesson per syllabus point.
// Hand-written courses live in <course-slug>.js next to this file.
// Courses produced by scripts/generate-lessons.js live in generated/<course-slug>.json.
// Both are normalised to the same shape here, so the API and player never care where a lesson came from.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courses } from '../catalog.js';

const dir = path.dirname(fileURLToPath(import.meta.url));

// Compact authoring format used in the hand-written files:
// { min, goals, slides: [[title, narration, [points]]], read: [[heading, body]], ex: [title, body], try: [steps], keys, quiz: [[q, [options], answer, why]] }
function normalise(raw, title) {
  if (!raw) return null;
  const slides = (raw.slides || []).map((s) => (Array.isArray(s) ? { title: s[0], narration: s[1], points: s[2] || [] } : s));
  const sections = (raw.read || raw.sections || []).map((s) => (Array.isArray(s) ? { heading: s[0], body: s[1] } : s));
  const ex = raw.ex || raw.example;
  const check = (raw.quiz || raw.check || []).map((q) => (Array.isArray(q) ? { q: q[0], options: q[1], a: q[2], why: q[3] } : q));
  return {
    title,
    minutes: raw.min || raw.minutes || 12,
    objectives: raw.goals || raw.objectives || [],
    slides,
    sections,
    example: Array.isArray(ex) ? { title: ex[0], body: ex[1] } : ex || null,
    activity: raw.try || raw.activity || [],
    takeaways: raw.keys || raw.takeaways || [],
    check,
  };
}

const store = new Map();

async function load() {
  for (const c of courses) {
    let modules = null;
    const js = path.join(dir, `${c.slug}.js`);
    const json = path.join(dir, 'generated', `${c.slug}.json`);
    if (fs.existsSync(js)) modules = (await import(`./${c.slug}.js`)).default;
    else if (fs.existsSync(json)) modules = JSON.parse(fs.readFileSync(json, 'utf8')).modules;
    if (!modules) continue;
    store.set(c.slug, c.modules.map((m, i) => m.points.map((p, j) => normalise(modules[i]?.[j], p))));
  }
}
await load();

/** Lessons for a course as [module][lesson], or null when the course has no lesson content yet. */
export const lessonsFor = (slug) => store.get(slug) || null;

/** Lesson count per module, used for progress. */
export const lessonCounts = (slug) => (store.get(slug) || []).map((m) => m.filter(Boolean).length);

/** Lesson count and total minutes, shown on course cards and pages instead of fixed durations. */
export function courseStats(slug) {
  const lessons = (store.get(slug) || []).flat().filter(Boolean);
  return { lesson_count: lessons.length, total_minutes: lessons.reduce((n, l) => n + l.minutes, 0) };
}
