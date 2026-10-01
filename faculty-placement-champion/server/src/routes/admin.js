import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireAdmin } from "../auth.js";
import { MODULE_COUNT } from "../examBank.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// One row per faculty account: how far they've got, their best exam result,
// and their certificate if issued. Small institute-wide deployment, so an
// admin sees everyone rather than being scoped to their own institution.
router.get("/faculty", (req, res) => {
  const users = db.prepare("SELECT id, name, email, institution, role, created_at FROM users ORDER BY created_at DESC").all();

  const progressByUser = db.prepare("SELECT * FROM progress").all();
  const progressMap = new Map(progressByUser.map((p) => [p.user_id, p]));

  const bestAttempt = db
    .prepare(
      `SELECT user_id, MAX(score) AS best_score, COUNT(*) AS attempts
       FROM exam_attempts GROUP BY user_id`
    )
    .all();
  const attemptMap = new Map(bestAttempt.map((a) => [a.user_id, a]));

  const certs = db.prepare("SELECT * FROM certificates").all();
  const certMap = new Map(certs.map((c) => [c.user_id, c]));

  const faculty = users
    .filter((u) => u.role !== "admin")
    .map((u) => {
      const progress = progressMap.get(u.id);
      const attempts = attemptMap.get(u.id);
      const cert = certMap.get(u.id);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        institution: u.institution,
        createdAt: u.created_at,
        modulesDone: progress ? JSON.parse(progress.done).length : 0,
        moduleCount: MODULE_COUNT,
        examAttempts: attempts ? attempts.attempts : 0,
        bestScore: attempts ? attempts.best_score : null,
        certificate: cert ? { id: cert.id, issuedAt: cert.issued_at, score: cert.score } : null,
      };
    });

  res.json({ faculty });
});

export default router;
