// Generate lesson content for a course with a local Ollama model.
//
//   npm run lessons:generate -- --course <slug> [--model llama3.1:8b] [--host http://localhost:11434] [--redo]
//
// Writes src/data/lessons/generated/<slug>.json, one lesson per syllabus point in catalog.js.
// Progress is saved after every lesson, so the script can be stopped and resumed. --redo regenerates everything.
// Hand-written files (src/data/lessons/<slug>.js) take priority over generated ones.
// Generated text is a first draft: review it before learners see it, then restart the API to load it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { courses } from '../src/data/catalog.js';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const slug = arg('course');
const model = arg('model', 'llama3.1:8b');
const host = arg('host', process.env.OLLAMA_HOST || 'http://localhost:11434');
const redo = process.argv.includes('--redo');

const course = courses.find((c) => c.slug === slug);
if (!course) {
  console.error(`Unknown or missing --course. Choose one of: ${courses.map((c) => c.slug).join(', ')}`);
  process.exit(1);
}

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/lessons/generated', `${slug}.json`);
fs.mkdirSync(path.dirname(out), { recursive: true });
const saved = !redo && fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : { course: slug, model, modules: [] };

const str = { type: 'string' };
const list = (min, max) => ({ type: 'array', items: str, minItems: min, maxItems: max });
const schema = {
  type: 'object',
  required: ['minutes', 'objectives', 'slides', 'sections', 'example', 'activity', 'takeaways', 'check'],
  properties: {
    minutes: { type: 'integer' },
    objectives: list(3, 3),
    slides: { type: 'array', minItems: 4, maxItems: 6, items: { type: 'object', required: ['title', 'narration', 'points'], properties: { title: str, narration: str, points: list(2, 4) } } },
    sections: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'object', required: ['heading', 'body'], properties: { heading: str, body: str } } },
    example: { type: 'object', required: ['title', 'body'], properties: { title: str, body: str } },
    activity: list(3, 4),
    takeaways: list(3, 3),
    check: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'object', required: ['q', 'options', 'a', 'why'], properties: { q: str, options: list(4, 4), a: { type: 'integer' }, why: str } } },
  },
};

function prompt(module, point) {
  return `You write lessons for Core5Campus, an Indian professional-development provider for school teachers.
Course: ${course.title} — ${course.tagline}
Module: ${module.title}
Lesson topic: ${point}
Audience: practising teachers in India (CBSE, ICSE, state boards). Use plain British English, short sentences, Indian classroom examples.
Write one lesson as JSON matching the schema:
- objectives: three "able to" outcomes, each starting with a verb.
- slides: 4–5 slides for a narrated video. "narration" is 2–4 spoken sentences; "points" are 2–4 short on-screen bullets.
- sections: three reading-note sections; "body" is 60–120 words; use lines starting "- " for lists.
- example: a short, realistic classroom story (no real names of schools or people).
- activity: 3–4 practical steps the teacher can do this week.
- takeaways: three one-line key points.
- check: two multiple-choice questions, four options each, "a" is the 0-based index of the correct option, "why" explains it in one sentence.
Do not invent statistics, laws, prices or exam rules. If something depends on a product plan or official rule, say to check the official source.`;
}

function valid(l) {
  return l && Array.isArray(l.slides) && l.slides.length >= 3 && l.slides.every((s) => s.title && s.narration && s.points?.length)
    && l.sections?.length && l.objectives?.length && l.takeaways?.length && l.activity?.length && l.example?.body
    && l.check?.every((q) => q.options?.length === 4 && Number.isInteger(q.a) && q.a >= 0 && q.a < 4);
}

async function generate(module, point) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, stream: false, format: schema, options: { temperature: 0.4 }, messages: [{ role: 'user', content: prompt(module, point) }] }),
    }).catch((e) => { throw new Error(`Cannot reach Ollama at ${host}: ${e.message}`); });
    const body = await res.json();
    if (!res.ok || body.error) throw new Error(`Ollama error: ${body.error || res.status}`);
    try {
      const lesson = JSON.parse(body.message.content);
      if (valid(lesson)) return lesson;
      console.warn(`  attempt ${attempt}: incomplete lesson, retrying`);
    } catch {
      console.warn(`  attempt ${attempt}: invalid JSON, retrying`);
    }
  }
  throw new Error(`Could not generate a valid lesson for "${point}" after 3 attempts.`);
}

const total = course.modules.reduce((n, m) => n + m.points.length, 0);
let done = 0;
console.log(`Generating ${total} lessons for ${course.title} with ${model} at ${host}`);
try {
  for (const [i, module] of course.modules.entries()) {
    saved.modules[i] ||= [];
    for (const [j, point] of module.points.entries()) {
      done += 1;
      if (saved.modules[i][j]) { console.log(`[${done}/${total}] ${i + 1}.${j + 1} already done`); continue; }
      const started = Date.now();
      process.stdout.write(`[${done}/${total}] ${i + 1}.${j + 1} ${point} … `);
      saved.modules[i][j] = await generate(module, point);
      fs.writeFileSync(out, JSON.stringify(saved, null, 2));
      console.log(`${Math.round((Date.now() - started) / 1000)}s`);
    }
  }
} catch (e) {
  console.error(`failed\n\n${e.message}`);
  console.error(`Check that Ollama runs: ollama run ${model} "hello". Lessons finished so far are saved; rerun to resume.`);
  process.exit(1);
}
console.log(`Done. Review ${path.relative(process.cwd(), out)}, then restart the API to load it.`);
