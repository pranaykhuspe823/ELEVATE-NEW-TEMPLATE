import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { bad, wrap } from '../util.js';
import { issueCertificate, certificatePdf } from '../services/certificates.js';
import { moduleDeck } from '../services/slides.js';
import { courseStats, lessonsFor } from '../data/lessons/index.js';
import { deckWithAudio } from '../data/lessons/deck.js';

const r = Router();
r.use(requireAuth);

const mine = (id, userId) => db.get('SELECT * FROM enrollments WHERE id=? AND user_id=?', id, userId);
// Enrol: courses are free and self-paced, so enrolment is instant
r.post('/enrollments', wrap(async (req, res) => {
  const course = await db.get("SELECT id FROM courses WHERE slug=? AND status='published'", String(req.body?.course_slug || ''));
  if (!course) return bad(res, 'This course is not open for enrolment.', 404);
  const existing = await db.get("SELECT * FROM enrollments WHERE user_id=? AND course_id=? AND status != 'cancelled'", req.user.id, course.id);
  if (existing) {
    // Enrolments started under the old paid flow are simply opened
    if (existing.status === 'pending') await db.run("UPDATE enrollments SET status='active', mode='self', amount=0 WHERE id=?", existing.id);
    return res.json({ enrollment_id: existing.id, status: existing.status === 'pending' ? 'active' : existing.status });
  }
  const { rows: [created] } = await db.run("INSERT INTO enrollments (user_id, course_id, mode, amount, status) VALUES (?,?,'self',0,'active') RETURNING id",
    req.user.id, course.id);
  res.status(201).json({ enrollment_id: created.id, status: 'active' });
}));

r.get('/me/enrollments', wrap(async (req, res) => {
  const rows = await db.all(`SELECT e.id, e.status, e.progress, e.lessons, e.quiz_score, e.created_at,
      c.slug, c.title, c.cert_title, c.cpd_hours, c.content,
      (SELECT code FROM certificates WHERE enrollment_id=e.id AND status='valid' LIMIT 1) AS certificate_code
    FROM enrollments e JOIN courses c ON c.id=e.course_id
    WHERE e.user_id=? AND e.status != 'cancelled' ORDER BY e.created_at DESC`, req.user.id);
  res.json(rows.map(({ content, progress, lessons, ...x }) => {
    const total = (JSON.parse(content || '{}').modules || []).length;
    return { ...x, modules_total: total, modules_done: JSON.parse(progress || '[]').length,
      lessons_total: courseStats(x.slug).lesson_count, lessons_done: JSON.parse(lessons || '[]').length };
  }));
}));

r.get('/me/enrollments/:id', wrap(async (req, res) => {
  const e = await mine(req.params.id, req.user.id);
  if (!e || e.status === 'cancelled') return bad(res, 'Enrolment not found.', 404);
  if (e.status === 'pending') await db.run("UPDATE enrollments SET status='active' WHERE id=?", e.id);
  const c = await db.get('SELECT slug, title, cert_title, cpd_hours, pass_mark, content FROM courses WHERE id=?', e.course_id);
  const content = JSON.parse(c.content || '{}');
  const lessons = lessonsFor(c.slug);
  const videos = new Set((await db.all('SELECT module, lesson FROM lesson_media WHERE course_slug=?', c.slug)).map((v) => `${v.module}.${v.lesson}`));
  const cert = await db.get("SELECT code FROM certificates WHERE enrollment_id=? AND status='valid'", e.id);
  res.json({
    id: e.id, status: e.status === 'pending' ? 'active' : e.status, quiz_score: e.quiz_score, quiz_attempts: e.quiz_attempts,
    progress: JSON.parse(e.progress || '[]'), certificate_code: cert?.code || null,
    course: { slug: c.slug, title: c.title, cert_title: c.cert_title, cpd_hours: c.cpd_hours, pass_mark: c.pass_mark,
      modules: (content.modules || []).map((m, i) => ({
        ...m,
        lessons: lessons?.[i]?.map((l, j) => l && { title: l.title, minutes: l.minutes, slides: l.slides.length, video: videos.has(`${i}.${j}`) }) || [],
      })) },
    lessons_done: JSON.parse(e.lessons || '[]'),
    quiz: (content.quiz || []).map(({ q, options }) => ({ q, options })), // answers stay on the server
  });
}));

r.post('/me/enrollments/:id/progress', wrap(async (req, res) => {
  const e = await mine(req.params.id, req.user.id);
  if (!e || !['active', 'completed'].includes(e.status)) return bad(res, 'Enrolment not active.', 404);
  const course = await db.get('SELECT slug, content FROM courses WHERE id=?', e.course_id);
  const total = (JSON.parse(course.content).modules || []).length;
  const idx = Number(req.body?.module);
  if (!Number.isInteger(idx) || idx < 0 || idx >= total) return bad(res, 'Unknown module.');
  if (lessonsFor(course.slug)) return bad(res, 'Modules complete automatically when you finish their lessons.');
  const set = new Set(JSON.parse(e.progress || '[]'));
  req.body?.done === false ? set.delete(idx) : set.add(idx);
  const progress = [...set].sort((a, b) => a - b);
  await db.run('UPDATE enrollments SET progress=? WHERE id=?', JSON.stringify(progress), e.id);
  res.json({ progress });
}));

// Lessons: one per syllabus point
const openEnrollment = async (req, res) => {
  const e = await mine(req.params.id, req.user.id);
  if (!e || !['active', 'completed'].includes(e.status)) { bad(res, 'Enrolment not active.', 404); return null; }
  const course = await db.get('SELECT slug, title, content FROM courses WHERE id=?', e.course_id);
  const lessons = lessonsFor(course.slug);
  if (!lessons) { bad(res, 'This course has no lessons yet.', 404); return null; }
  return { e, course, lessons };
};
const lessonAt = (lessons, m, l) => (Number.isInteger(m) && Number.isInteger(l) ? lessons[m]?.[l] : null);

r.get('/me/enrollments/:id/lessons/:m/:l', wrap(async (req, res) => {
  const ctx = await openEnrollment(req, res); if (!ctx) return;
  const m = Number(req.params.m), l = Number(req.params.l);
  const lesson = lessonAt(ctx.lessons, m, l);
  if (!lesson) return bad(res, 'Lesson not found.', 404);
  const flat = ctx.lessons.flatMap((mod, i) => mod.map((x, j) => x && [i, j])).filter(Boolean);
  const pos = flat.findIndex(([i, j]) => i === m && j === l);
  const video = await db.get('SELECT video_url FROM lesson_media WHERE course_slug=? AND module=? AND lesson=?', ctx.course.slug, m, l);
  res.json({
    ...lesson, module: m, lesson: l, deck: deckWithAudio(lesson, `Lesson ${m + 1}.${l + 1}`), module_title: JSON.parse(ctx.course.content).modules[m].title,
    course_title: ctx.course.title, video_url: video?.video_url || null,
    done: JSON.parse(ctx.e.lessons || '[]').includes(`${m}.${l}`),
    prev: flat[pos - 1] || null, next: flat[pos + 1] || null,
  });
}));

r.post('/me/enrollments/:id/lessons', wrap(async (req, res) => {
  const ctx = await openEnrollment(req, res); if (!ctx) return;
  const m = Number(req.body?.module), l = Number(req.body?.lesson);
  if (!lessonAt(ctx.lessons, m, l)) return bad(res, 'Lesson not found.', 404);
  const done = new Set(JSON.parse(ctx.e.lessons || '[]'));
  req.body?.done === false ? done.delete(`${m}.${l}`) : done.add(`${m}.${l}`);
  // A module is complete when every one of its lessons is complete
  const modules = ctx.lessons.map((mod, i) => (mod.every((x, j) => !x || done.has(`${i}.${j}`)) ? i : -1)).filter((i) => i >= 0);
  const lessons = [...done].sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  await db.run('UPDATE enrollments SET lessons=?, progress=? WHERE id=?', JSON.stringify(lessons), JSON.stringify(modules), ctx.e.id);
  res.json({ lessons_done: lessons, progress: modules });
}));

r.get('/me/enrollments/:id/modules/:m/slides.pptx', wrap(async (req, res) => {
  const ctx = await openEnrollment(req, res); if (!ctx) return;
  const m = Number(req.params.m);
  if (!Number.isInteger(m) || !ctx.lessons[m]) return bad(res, 'Module not found.', 404);
  const buf = await moduleDeck({
    courseTitle: ctx.course.title, moduleIndex: m, moduleTitle: JSON.parse(ctx.course.content).modules[m].title,
    lessons: ctx.lessons[m].filter(Boolean),
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="core5campus-${ctx.course.slug}-module-${m + 1}.pptx"`);
  res.send(buf);
}));

r.post('/me/enrollments/:id/assessment', wrap(async (req, res) => {
  const e = await mine(req.params.id, req.user.id);
  if (!e || !['active', 'completed'].includes(e.status)) return bad(res, 'Enrolment not active.', 404);
  const c = await db.get('SELECT pass_mark, content FROM courses WHERE id=?', e.course_id);
  const content = JSON.parse(c.content || '{}');
  const quiz = content.quiz || [];
  if (JSON.parse(e.progress || '[]').length < (content.modules || []).length) return bad(res, 'Mark every module complete before taking the assessment.');
  const answers = Array.isArray(req.body?.answers) ? req.body.answers : [];
  if (answers.length !== quiz.length || answers.some((a) => !Number.isInteger(a))) return bad(res, 'Answer every question before submitting.');
  const correct = quiz.reduce((n, q, i) => n + (q.a === answers[i] ? 1 : 0), 0);
  const score = Math.round((correct / quiz.length) * 100);
  const passed = score >= c.pass_mark;
  await db.run('UPDATE enrollments SET quiz_attempts=quiz_attempts+1, quiz_score=GREATEST(COALESCE(quiz_score,0), ?::int) WHERE id=?', score, e.id);
  const cert = passed ? await issueCertificate({ enrollmentId: e.id, score }) : null;
  res.json({ score, correct, total: quiz.length, passed, pass_mark: c.pass_mark, certificate_code: cert?.code || null });
}));

r.get('/me/certificates', wrap(async (req, res) => {
  res.json(await db.all(`SELECT x.code, x.course_title, x.cert_title, x.cpd_hours, x.score, x.status, x.issued_at, x.credly_status, c.slug
    FROM certificates x JOIN courses c ON c.id=x.course_id WHERE x.user_id=? ORDER BY x.issued_at DESC`, req.user.id));
}));

r.get('/certificates/:code/pdf', wrap(async (req, res) => {
  const cert = await db.get('SELECT * FROM certificates WHERE code=?', String(req.params.code).toUpperCase());
  if (!cert || (cert.user_id !== req.user.id && req.user.role !== 'admin')) return bad(res, 'Certificate not found.', 404);
  if (cert.status !== 'valid') return bad(res, 'This certificate has been revoked.', 410);
  await certificatePdf(cert, res);
}));

export default r;
