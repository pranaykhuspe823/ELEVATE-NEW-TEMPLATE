import { Router } from "express";
import crypto from "node:crypto";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { pickQuestionIds, sanitizedQuestions, gradeAnswers, MODULE_COUNT, EXAM_N, PASS } from "../examBank.js";

const router = Router();
router.use(requireAuth);

function allModulesDone(userId) {
  const row = db.prepare("SELECT done FROM progress WHERE user_id = ?").get(userId);
  return JSON.parse(row.done).length >= MODULE_COUNT;
}

function makeCertId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
  return `C5-FPC-${new Date().getFullYear()}-${suffix}`;
}

function uniqueCertId() {
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = makeCertId();
    const exists = db.prepare("SELECT 1 FROM certificates WHERE id = ?").get(id);
    if (!exists) return id;
  }
  throw new Error("Could not generate a unique certificate id");
}

router.get("/status", (req, res) => {
  const attempt = db
    .prepare("SELECT id, score, passed, created_at FROM exam_attempts WHERE user_id = ? ORDER BY id DESC LIMIT 1")
    .get(req.userId);
  const certificate = db.prepare("SELECT * FROM certificates WHERE user_id = ?").get(req.userId);
  res.json({
    unlocked: allModulesDone(req.userId),
    examLength: EXAM_N,
    passMark: PASS,
    lastAttempt: attempt ? { ...attempt, passed: !!attempt.passed } : null,
    certificate: certificate || null,
  });
});

router.post("/start", (req, res) => {
  if (!allModulesDone(req.userId)) {
    return res.status(403).json({ error: "Complete every module before starting the exam" });
  }
  const ids = pickQuestionIds();
  const examId = crypto.randomUUID();
  db.prepare("DELETE FROM exam_sessions WHERE user_id = ?").run(req.userId);
  db.prepare("INSERT INTO exam_sessions (id, user_id, question_ids) VALUES (?, ?, ?)").run(examId, req.userId, JSON.stringify(ids));
  res.status(201).json({ examId, questions: sanitizedQuestions(ids) });
});

router.post("/submit", (req, res) => {
  const { examId, answers } = req.body || {};
  if (!examId || typeof answers !== "object" || answers === null) {
    return res.status(400).json({ error: "examId and answers are required" });
  }
  const session = db.prepare("SELECT * FROM exam_sessions WHERE id = ? AND user_id = ?").get(examId, req.userId);
  if (!session) return res.status(404).json({ error: "No active exam session with that id. Start a new attempt." });

  const ids = JSON.parse(session.question_ids);
  const normalizedAnswers = {};
  for (const [qi, oi] of Object.entries(answers)) normalizedAnswers[qi] = Number(oi);
  const { score, passed, perQuestion } = gradeAnswers(ids, normalizedAnswers);

  db.prepare("DELETE FROM exam_sessions WHERE id = ?").run(examId);
  const attemptInfo = db
    .prepare("INSERT INTO exam_attempts (user_id, question_ids, score, passed) VALUES (?, ?, ?, ?)")
    .run(req.userId, session.question_ids, score, passed ? 1 : 0);
  const attemptId = Number(attemptInfo.lastInsertRowid);

  let certificate = db.prepare("SELECT * FROM certificates WHERE user_id = ?").get(req.userId);
  if (passed && !certificate) {
    const user = db.prepare("SELECT name, institution FROM users WHERE id = ?").get(req.userId);
    const certId = uniqueCertId();
    db.prepare(
      "INSERT INTO certificates (id, user_id, exam_attempt_id, name_on_cert, institution_on_cert, score) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(certId, req.userId, attemptId, user.name, user.institution, score);
    certificate = db.prepare("SELECT * FROM certificates WHERE id = ?").get(certId);
  }

  res.json({ score, passed, passMark: PASS, perQuestion, certificate: certificate || null });
});

export default router;
