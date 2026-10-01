import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";
import { MODULE_COUNT } from "../examBank.js";

const router = Router();
router.use(requireAuth);

function loadProgress(userId) {
  const row = db.prepare("SELECT * FROM progress WHERE user_id = ?").get(userId);
  return {
    done: JSON.parse(row.done),
    checks: JSON.parse(row.checks),
    tools: JSON.parse(row.tools),
    current: row.current,
  };
}

router.get("/", (req, res) => {
  const user = db.prepare("SELECT id, name, email, institution, role FROM users WHERE id = ?").get(req.userId);
  res.json({ user, progress: loadProgress(req.userId) });
});

router.put("/", (req, res) => {
  const { done, checks, tools, current } = req.body || {};
  const existing = loadProgress(req.userId);

  if (done !== undefined) {
    if (!Array.isArray(done) || done.some((i) => !Number.isInteger(i) || i < 0 || i >= MODULE_COUNT)) {
      return res.status(400).json({ error: "done must be an array of valid module indices" });
    }
    existing.done = [...new Set(done)];
  }
  if (checks !== undefined) {
    if (typeof checks !== "object" || checks === null || Array.isArray(checks)) {
      return res.status(400).json({ error: "checks must be an object" });
    }
    existing.checks = checks;
  }
  if (tools !== undefined) {
    if (typeof tools !== "object" || tools === null || Array.isArray(tools)) {
      return res.status(400).json({ error: "tools must be an object" });
    }
    existing.tools = tools;
  }
  if (current !== undefined) {
    if (!Number.isInteger(current) || current < 0 || current > MODULE_COUNT + 1) {
      return res.status(400).json({ error: "current is out of range" });
    }
    existing.current = current;
  }

  db.prepare(
    "UPDATE progress SET done = ?, checks = ?, tools = ?, current = ?, updated_at = datetime('now') WHERE user_id = ?"
  ).run(JSON.stringify(existing.done), JSON.stringify(existing.checks), JSON.stringify(existing.tools), existing.current, req.userId);

  res.json({ progress: existing });
});

export default router;
