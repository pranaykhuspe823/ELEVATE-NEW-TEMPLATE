import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { str, bad, wrap } from '../util.js';
import { issueCertificate } from '../services/certificates.js';
import { credlyConfigured, sendToCredly } from '../services/credly.js';
import { courseStats, lessonsFor } from '../data/lessons/index.js';

const r = Router();
r.use(requireAdmin);

r.get('/overview', wrap(async (req, res) => {
  const n = async (sql) => (await db.get(sql)).n;
  res.json({
    enquiries_new: await n("SELECT COUNT(*) n FROM enquiries WHERE status='new'"),
    enquiries_total: await n('SELECT COUNT(*) n FROM enquiries'),
    learners: await n("SELECT COUNT(*) n FROM users WHERE role='learner'"),
    enrollments_active: await n("SELECT COUNT(*) n FROM enrollments WHERE status IN ('active','completed')"),
    certificates: await n("SELECT COUNT(*) n FROM certificates WHERE status='valid'"),
    by_course: await db.all(`SELECT c.title,
        (SELECT COUNT(*) FROM enquiries q WHERE q.course_slug=c.slug) AS enquiries,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed')) AS enrollments
      FROM courses c WHERE c.status='published' ORDER BY c.sort`),
  });
}));

/* Enquiries */
r.get('/enquiries', wrap(async (req, res) => {
  const status = str(req.query.status, 20);
  res.json(status
    ? await db.all('SELECT * FROM enquiries WHERE status=? ORDER BY id DESC LIMIT 500', status)
    : await db.all('SELECT * FROM enquiries ORDER BY id DESC LIMIT 500'));
}));
r.patch('/enquiries/:id', wrap(async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['new', 'contacted', 'converted', 'closed'].includes(status)) return bad(res, 'Unknown status.');
  await db.run('UPDATE enquiries SET status=? WHERE id=?', status, req.params.id);
  res.json({ ok: true });
}));
r.get('/enquiries.csv', wrap(async (req, res) => {
  const rows = await db.all('SELECT id, created_at, type, status, name, email, phone, role, institution, course_slug, message, meta FROM enquiries ORDER BY id DESC');
  const cols = ['id', 'created_at', 'type', 'status', 'name', 'email', 'phone', 'role', 'institution', 'course_slug', 'message', 'meta'];
  // Prefix cells starting with = + - @ so spreadsheets do not run them as formulas
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="core5-enquiries.csv"');
  res.send('﻿' + [cols.join(','), ...rows.map((x) => cols.map((c) => cell(x[c])).join(','))].join('\n'));
}));

/* Enrolments */
r.get('/enrollments', wrap(async (req, res) => {
  const rows = await db.all(`SELECT e.id, e.status, e.progress, e.lessons, e.quiz_score, e.created_at,
      u.name, u.email, u.phone, c.slug, c.title AS course,
      (SELECT code FROM certificates WHERE enrollment_id=e.id AND status='valid' LIMIT 1) AS certificate_code
    FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id
    ORDER BY e.id DESC LIMIT 500`);
  res.json(rows.map(({ lessons, ...e }) => ({ ...e, lessons_done: JSON.parse(lessons || '[]').length, lessons_total: courseStats(e.slug).lesson_count })));
}));
r.patch('/enrollments/:id', wrap(async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['active', 'cancelled'].includes(status)) return bad(res, 'Unknown status.');
  await db.run('UPDATE enrollments SET status=? WHERE id=?', status, req.params.id);
  res.json({ ok: true });
}));
r.post('/enrollments/:id/certificate', wrap(async (req, res) => {
  const e = await db.get('SELECT * FROM enrollments WHERE id=?', req.params.id);
  if (!e || !['active', 'completed'].includes(e.status)) return bad(res, 'Only active enrolments can be certified.');
  res.status(201).json(await issueCertificate({ enrollmentId: e.id, score: e.quiz_score }));
}));

/* Courses (free and self-paced: only visibility is managed here) */
r.get('/courses', wrap(async (req, res) => {
  const rows = await db.all(`SELECT c.id, c.slug, c.title, c.status, c.cpd_hours, c.credly_template_id,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed')) AS enrolled
    FROM courses c ORDER BY c.sort`);
  res.json(rows.map((c) => ({ ...c, ...courseStats(c.slug) })));
}));
r.patch('/courses/:id', wrap(async (req, res) => {
  const c = await db.get('SELECT * FROM courses WHERE id=?', req.params.id);
  if (!c) return bad(res, 'Course not found.', 404);
  const status = ['published', 'upcoming', 'hidden'].includes(req.body?.status) ? req.body.status : c.status;
  let template = c.credly_template_id;
  if ('credly_template_id' in (req.body || {})) {
    template = str(req.body.credly_template_id, 64) || null;
    if (template && !/^[0-9a-f-]{36}$/i.test(template)) return bad(res, 'A Credly badge template ID looks like 13034728-bb90-473b-ba8a-97b4fab04420.');
  }
  await db.run('UPDATE courses SET status=?, credly_template_id=? WHERE id=?', status, template, c.id);
  res.json({ ok: true });
}));

/* Lesson videos: an optional recorded video per lesson, shown above the narrated slides */
r.get('/lessons/:slug', wrap(async (req, res) => {
  const lessons = lessonsFor(req.params.slug);
  if (!lessons) return bad(res, 'This course has no lessons yet.', 404);
  const course = await db.get('SELECT content FROM courses WHERE slug=?', req.params.slug);
  const media = await db.all('SELECT module, lesson, video_url FROM lesson_media WHERE course_slug=?', req.params.slug);
  const url = (m, l) => media.find((x) => x.module === m && x.lesson === l)?.video_url || '';
  res.json(JSON.parse(course.content).modules.map((m, i) => ({
    title: m.title, lessons: lessons[i].map((l, j) => ({ title: l?.title, video_url: url(i, j) })),
  })));
}));
r.put('/lessons/:slug/:m/:l', wrap(async (req, res) => {
  const lessons = lessonsFor(req.params.slug);
  const m = Number(req.params.m), l = Number(req.params.l);
  if (!lessons?.[m]?.[l]) return bad(res, 'Lesson not found.', 404);
  const url = str(req.body?.video_url, 500);
  if (!url) {
    await db.run('DELETE FROM lesson_media WHERE course_slug=? AND module=? AND lesson=?', req.params.slug, m, l);
    return res.json({ ok: true });
  }
  if (!/^https:\/\/\S+$/.test(url)) return bad(res, 'Use a full https:// link to YouTube, Vimeo or an .mp4 file.');
  await db.run(`INSERT INTO lesson_media (course_slug, module, lesson, video_url) VALUES (?,?,?,?)
    ON CONFLICT (course_slug, module, lesson) DO UPDATE SET video_url=excluded.video_url`, req.params.slug, m, l, url);
  res.json({ ok: true });
}));

/* Certificates */
r.get('/certificates', wrap(async (req, res) => {
  res.json(await db.all(`SELECT c.id, c.code, c.holder_name, c.cert_title, c.course_title, c.score, c.status, c.issued_at, u.email,
      c.credly_status, c.credly_error, c.credly_sent_at
    FROM certificates c JOIN users u ON u.id=c.user_id ORDER BY c.id DESC LIMIT 500`));
}));
r.get('/credly', (req, res) => res.json({ connected: credlyConfigured(), sandbox: process.env.CREDLY_SANDBOX === 'true' }));
r.post('/certificates/:id/credly', wrap(async (req, res) => {
  const c = await db.get('SELECT id, status FROM certificates WHERE id=?', req.params.id);
  if (!c || c.status !== 'valid') return bad(res, 'Only valid certificates can be sent to Credly.');
  await sendToCredly(c.id);
  res.json(await db.get('SELECT credly_status, credly_error, credly_sent_at FROM certificates WHERE id=?', c.id));
}));
r.patch('/certificates/:id', wrap(async (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['valid', 'revoked'].includes(status)) return bad(res, 'Unknown status.');
  await db.run('UPDATE certificates SET status=? WHERE id=?', status, req.params.id);
  res.json({ ok: true });
}));

/* Learners: password reset. The site sends no email, so the admin passes the temporary password on to the learner. */
r.post('/users/reset-password', wrap(async (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const u = await db.get('SELECT id, name, email, role FROM users WHERE email=?', email);
  if (!u) return bad(res, 'No account uses this email.', 404);
  if (u.role === 'admin') return bad(res, 'Admin passwords cannot be reset here.');
  const temp = crypto.randomBytes(9).toString('base64url');
  await db.run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(temp, 10), u.id);
  res.json({ name: u.name, email: u.email, temp_password: temp });
}));

/* Webinars */
r.get('/events', wrap(async (req, res) => {
  res.json(await db.all(`SELECT e.*, (SELECT COUNT(*) FROM event_registrations x WHERE x.event_id=e.id) AS registrations FROM events e ORDER BY starts_at DESC`));
}));
r.get('/events/:id/registrations', wrap(async (req, res) => {
  res.json(await db.all('SELECT name, email, phone, institution, created_at FROM event_registrations WHERE event_id=? ORDER BY id', req.params.id));
}));
r.post('/events', wrap(async (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 160);
  if (title.length < 3) return bad(res, 'Enter a title.');
  if (Number.isNaN(new Date(b.starts_at).getTime())) return bad(res, 'Pick a date and time.');
  const { rows: [created] } = await db.run('INSERT INTO events (title, description, starts_at, duration_min, speaker, join_url) VALUES (?,?,?,?,?,?) RETURNING id',
    title, str(b.description, 1000), new Date(b.starts_at).toISOString(), Math.max(15, parseInt(b.duration_min, 10) || 60), str(b.speaker, 120), str(b.join_url, 300));
  res.status(201).json({ id: created.id });
}));
r.delete('/events/:id', wrap(async (req, res) => {
  await db.run('DELETE FROM events WHERE id=?', req.params.id);
  res.json({ ok: true });
}));

export default r;
