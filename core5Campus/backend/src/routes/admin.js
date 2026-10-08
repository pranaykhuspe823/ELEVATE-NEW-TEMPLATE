import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';
import { str, bad } from '../util.js';
import { issueCertificate } from '../services/certificates.js';
import { credlyConfigured, sendToCredly } from '../services/credly.js';
import { courseStats, lessonsFor } from '../data/lessons/index.js';

const r = Router();
r.use(requireAdmin);

r.get('/overview', (req, res) => {
  const n = (sql) => db.prepare(sql).get().n;
  res.json({
    enquiries_new: n("SELECT COUNT(*) n FROM enquiries WHERE status='new'"),
    enquiries_total: n('SELECT COUNT(*) n FROM enquiries'),
    learners: n("SELECT COUNT(*) n FROM users WHERE role='learner'"),
    enrollments_active: n("SELECT COUNT(*) n FROM enrollments WHERE status IN ('active','completed')"),
    certificates: n("SELECT COUNT(*) n FROM certificates WHERE status='valid'"),
    by_course: db.prepare(`SELECT c.title,
        (SELECT COUNT(*) FROM enquiries q WHERE q.course_slug=c.slug) AS enquiries,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed')) AS enrollments
      FROM courses c WHERE c.status='published' ORDER BY c.sort`).all(),
  });
});

/* Enquiries */
r.get('/enquiries', (req, res) => {
  const status = str(req.query.status, 20);
  res.json(status
    ? db.prepare('SELECT * FROM enquiries WHERE status=? ORDER BY id DESC LIMIT 500').all(status)
    : db.prepare('SELECT * FROM enquiries ORDER BY id DESC LIMIT 500').all());
});
r.patch('/enquiries/:id', (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['new', 'contacted', 'converted', 'closed'].includes(status)) return bad(res, 'Unknown status.');
  db.prepare('UPDATE enquiries SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});
r.get('/enquiries.csv', (req, res) => {
  const rows = db.prepare('SELECT id, created_at, type, status, name, email, phone, role, institution, course_slug, message, meta FROM enquiries ORDER BY id DESC').all();
  const cols = ['id', 'created_at', 'type', 'status', 'name', 'email', 'phone', 'role', 'institution', 'course_slug', 'message', 'meta'];
  // Prefix cells starting with = + - @ so spreadsheets do not run them as formulas
  const cell = (v) => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="core5-enquiries.csv"');
  res.send('\uFEFF' + [cols.join(','), ...rows.map((x) => cols.map((c) => cell(x[c])).join(','))].join('\n'));
});

/* Enrolments */
r.get('/enrollments', (req, res) => {
  res.json(db.prepare(`SELECT e.id, e.status, e.progress, e.lessons, e.quiz_score, e.created_at,
      u.name, u.email, u.phone, c.slug, c.title AS course,
      (SELECT code FROM certificates WHERE enrollment_id=e.id AND status='valid') AS certificate_code
    FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id
    ORDER BY e.id DESC LIMIT 500`).all().map(({ lessons, ...e }) => ({ ...e, lessons_done: JSON.parse(lessons || '[]').length, lessons_total: courseStats(e.slug).lesson_count })));
});
r.patch('/enrollments/:id', (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['active', 'cancelled'].includes(status)) return bad(res, 'Unknown status.');
  db.prepare('UPDATE enrollments SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});
r.post('/enrollments/:id/certificate', (req, res) => {
  const e = db.prepare('SELECT * FROM enrollments WHERE id=?').get(req.params.id);
  if (!e || !['active', 'completed'].includes(e.status)) return bad(res, 'Only active enrolments can be certified.');
  res.status(201).json(issueCertificate({ enrollmentId: e.id, score: e.quiz_score }));
});

/* Courses (free and self-paced: only visibility is managed here) */
r.get('/courses', (req, res) => {
  res.json(db.prepare(`SELECT c.id, c.slug, c.title, c.status, c.cpd_hours, c.credly_template_id,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id AND e.status IN ('active','completed')) AS enrolled
    FROM courses c ORDER BY c.sort`).all().map((c) => ({ ...c, ...courseStats(c.slug) })));
});
r.patch('/courses/:id', (req, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id);
  if (!c) return bad(res, 'Course not found.', 404);
  const status = ['published', 'upcoming', 'hidden'].includes(req.body?.status) ? req.body.status : c.status;
  let template = c.credly_template_id;
  if ('credly_template_id' in (req.body || {})) {
    template = str(req.body.credly_template_id, 64) || null;
    if (template && !/^[0-9a-f-]{36}$/i.test(template)) return bad(res, 'A Credly badge template ID looks like 13034728-bb90-473b-ba8a-97b4fab04420.');
  }
  db.prepare('UPDATE courses SET status=?, credly_template_id=? WHERE id=?').run(status, template, c.id);
  res.json({ ok: true });
});

/* Lesson videos: an optional recorded video per lesson, shown above the narrated slides */
r.get('/lessons/:slug', (req, res) => {
  const lessons = lessonsFor(req.params.slug);
  if (!lessons) return bad(res, 'This course has no lessons yet.', 404);
  const course = db.prepare('SELECT content FROM courses WHERE slug=?').get(req.params.slug);
  const media = db.prepare('SELECT module, lesson, video_url FROM lesson_media WHERE course_slug=?').all(req.params.slug);
  const url = (m, l) => media.find((x) => x.module === m && x.lesson === l)?.video_url || '';
  res.json(JSON.parse(course.content).modules.map((m, i) => ({
    title: m.title, lessons: lessons[i].map((l, j) => ({ title: l?.title, video_url: url(i, j) })),
  })));
});
r.put('/lessons/:slug/:m/:l', (req, res) => {
  const lessons = lessonsFor(req.params.slug);
  const m = Number(req.params.m), l = Number(req.params.l);
  if (!lessons?.[m]?.[l]) return bad(res, 'Lesson not found.', 404);
  const url = str(req.body?.video_url, 500);
  if (!url) {
    db.prepare('DELETE FROM lesson_media WHERE course_slug=? AND module=? AND lesson=?').run(req.params.slug, m, l);
    return res.json({ ok: true });
  }
  if (!/^https:\/\/\S+$/.test(url)) return bad(res, 'Use a full https:// link to YouTube, Vimeo or an .mp4 file.');
  db.prepare(`INSERT INTO lesson_media (course_slug, module, lesson, video_url) VALUES (?,?,?,?)
    ON CONFLICT (course_slug, module, lesson) DO UPDATE SET video_url=excluded.video_url`).run(req.params.slug, m, l, url);
  res.json({ ok: true });
});

/* Certificates */
r.get('/certificates', (req, res) => {
  res.json(db.prepare(`SELECT c.id, c.code, c.holder_name, c.cert_title, c.course_title, c.score, c.status, c.issued_at, u.email,
      c.credly_status, c.credly_error, c.credly_sent_at
    FROM certificates c JOIN users u ON u.id=c.user_id ORDER BY c.id DESC LIMIT 500`).all());
});
r.get('/credly', (req, res) => res.json({ connected: credlyConfigured(), sandbox: process.env.CREDLY_SANDBOX === 'true' }));
r.post('/certificates/:id/credly', async (req, res) => {
  const c = db.prepare('SELECT id, status FROM certificates WHERE id=?').get(req.params.id);
  if (!c || c.status !== 'valid') return bad(res, 'Only valid certificates can be sent to Credly.');
  await sendToCredly(c.id);
  res.json(db.prepare('SELECT credly_status, credly_error, credly_sent_at FROM certificates WHERE id=?').get(c.id));
});
r.patch('/certificates/:id', (req, res) => {
  const status = str(req.body?.status, 20);
  if (!['valid', 'revoked'].includes(status)) return bad(res, 'Unknown status.');
  db.prepare('UPDATE certificates SET status=? WHERE id=?').run(status, req.params.id);
  res.json({ ok: true });
});

/* Learners: password reset. The site sends no email, so the admin passes the temporary password on to the learner. */
r.post('/users/reset-password', (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const u = db.prepare('SELECT id, name, email, role FROM users WHERE email=?').get(email);
  if (!u) return bad(res, 'No account uses this email.', 404);
  if (u.role === 'admin') return bad(res, 'Admin passwords cannot be reset here.');
  const temp = crypto.randomBytes(9).toString('base64url');
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(temp, 10), u.id);
  res.json({ name: u.name, email: u.email, temp_password: temp });
});

/* Webinars */
r.get('/events', (req, res) => {
  res.json(db.prepare(`SELECT e.*, (SELECT COUNT(*) FROM event_registrations x WHERE x.event_id=e.id) AS registrations FROM events e ORDER BY starts_at DESC`).all());
});
r.get('/events/:id/registrations', (req, res) => {
  res.json(db.prepare('SELECT name, email, phone, institution, created_at FROM event_registrations WHERE event_id=? ORDER BY id').all(req.params.id));
});
r.post('/events', (req, res) => {
  const b = req.body || {};
  const title = str(b.title, 160);
  if (title.length < 3) return bad(res, 'Enter a title.');
  if (Number.isNaN(new Date(b.starts_at).getTime())) return bad(res, 'Pick a date and time.');
  const { lastInsertRowid } = db.prepare('INSERT INTO events (title, description, starts_at, duration_min, speaker, join_url) VALUES (?,?,?,?,?,?)')
    .run(title, str(b.description, 1000), new Date(b.starts_at).toISOString(), Math.max(15, parseInt(b.duration_min, 10) || 60), str(b.speaker, 120), str(b.join_url, 300));
  res.status(201).json({ id: lastInsertRowid });
});
r.delete('/events/:id', (req, res) => { db.prepare('DELETE FROM events WHERE id=?').run(req.params.id); res.json({ ok: true }); });

export default r;
