import { Router } from 'express';
import { db } from '../db.js';
import { str, isEmail, isPhone, bad, wrap } from '../util.js';
import { syllabusPdf, verifyUrl } from '../services/certificates.js';
import { courseStats, lessonsFor } from '../data/lessons/index.js';
import { badgeFor, badgeSvg } from '../services/badge.js';

const r = Router();

r.get('/catalog', wrap(async (req, res) => {
  const cats = await db.all('SELECT * FROM categories ORDER BY sort');
  const rows = await db.all(`SELECT id, slug, category_id, title, short, tagline, status, cpd_hours, cert_title
    FROM courses WHERE status != 'hidden' ORDER BY sort`);
  res.json({
    categories: cats.map((c) => ({
      ...c,
      courses: rows.filter((x) => x.category_id === c.id).map((x) => ({ ...x, ...courseStats(x.slug) })),
    })),
  });
}));

const getCourse = (slug) => db.get("SELECT * FROM courses WHERE slug=? AND status != 'hidden'", slug);

r.get('/courses/:slug', wrap(async (req, res) => {
  const c = await getCourse(req.params.slug);
  if (!c) return bad(res, 'Course not found.', 404);
  const { quiz, ...content } = JSON.parse(c.content || '{}'); // never expose the answer key
  const category = await db.get('SELECT slug, name FROM categories WHERE id=?', c.category_id);
  delete c.content; delete c.fee_live; delete c.fee_self; delete c.duration_weeks;
  // Lesson titles and lengths for the syllabus (lesson content itself is only for enrolled learners)
  const lessons = lessonsFor(c.slug);
  content.modules = (content.modules || []).map((m, i) => ({
    title: m.title,
    lessons: lessons?.[i]?.filter(Boolean).map((l) => ({ title: l.title, minutes: l.minutes })) || m.points.map((p) => ({ title: p, minutes: null })),
  }));
  res.json({ ...c, ...content, category, ...courseStats(c.slug), assessment_questions: quiz?.length || 0 });
}));

r.get('/courses/:slug/syllabus.pdf', wrap(async (req, res) => {
  const c = await getCourse(req.params.slug);
  if (!c || c.status !== 'published') return bad(res, 'Syllabus not available.', 404);
  syllabusPdf(c, JSON.parse(c.content || '{}'), res);
}));

const TYPES = ['enquiry', 'syllabus', 'school_pd', 'notify', 'contact'];
r.post('/enquiries', wrap(async (req, res) => {
  const b = req.body || {};
  if (str(b.website)) return res.json({ ok: true }); // honeypot field: bots fill it, people never see it
  const name = str(b.name, 120), email = str(b.email, 160).toLowerCase(), phone = str(b.phone, 20);
  if (name.length < 2) return bad(res, 'Enter your full name.');
  if (!isEmail(email)) return bad(res, 'Enter a valid email address.');
  if (phone && !isPhone(phone)) return bad(res, 'Enter a valid phone number, or leave it blank.');
  const type = TYPES.includes(b.type) ? b.type : 'enquiry';
  const meta = b.meta && typeof b.meta === 'object' ? JSON.stringify(b.meta).slice(0, 2000) : null;
  await db.run(`INSERT INTO enquiries (type, name, email, phone, role, institution, course_slug, message, meta) VALUES (?,?,?,?,?,?,?,?,?)`,
    type, name, email, phone, str(b.role, 80), str(b.institution, 160), str(b.course_slug, 80), str(b.message, 2000), meta);
  res.status(201).json({ ok: true });
}));

r.get('/events', wrap(async (req, res) => {
  const rows = await db.all('SELECT id, title, description, starts_at, duration_min, speaker FROM events ORDER BY starts_at');
  const now = Date.now();
  res.json(rows.filter((e) => new Date(e.starts_at).getTime() + e.duration_min * 60000 > now));
}));

r.post('/events/:id/register', wrap(async (req, res) => {
  const ev = await db.get('SELECT id FROM events WHERE id=?', req.params.id);
  if (!ev) return bad(res, 'Webinar not found.', 404);
  const b = req.body || {};
  const name = str(b.name, 120), email = str(b.email, 160).toLowerCase(), phone = str(b.phone, 20);
  if (name.length < 2) return bad(res, 'Enter your full name.');
  if (!isEmail(email)) return bad(res, 'Enter a valid email address.');
  if (phone && !isPhone(phone)) return bad(res, 'Enter a valid phone number, or leave it blank.');
  await db.run('INSERT INTO event_registrations (event_id, name, email, phone, institution) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING',
    ev.id, name, email, phone, str(b.institution, 160));
  res.status(201).json({ ok: true });
}));

// Course badge image (public, so it can be shown on profiles and shared)
r.get('/badges/:slug.svg', (req, res) => {
  const badge = badgeFor(req.params.slug);
  if (!badge) return bad(res, 'Badge not found.', 404);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // badges may be shown on other sites and profiles
  res.setHeader('Cache-Control', 'no-cache'); // always revalidate (ETag), so design changes show up straight away
  res.send(badgeSvg(badge));
});

r.get('/certificates/verify/:code', wrap(async (req, res) => {
  const code = str(req.params.code, 40).toUpperCase();
  const c = await db.get(`SELECT x.code, x.holder_name, x.course_title, x.cert_title, x.cpd_hours, x.status, x.issued_at, c.slug
    FROM certificates x JOIN courses c ON c.id=x.course_id WHERE x.code=?`, code);
  if (!c) return res.status(404).json({ found: false, error: 'No certificate matches this ID. Check the ID and try again.' });
  res.json({ found: true, ...c, verify_url: verifyUrl(c.code) });
}));

export default r;
