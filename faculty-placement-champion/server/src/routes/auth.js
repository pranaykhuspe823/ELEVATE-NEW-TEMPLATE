import { Router } from "express";
import { db } from "../db.js";
import { signToken, roleForEmail } from "../auth.js";

const router = Router();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, institution: row.institution, role: row.role };
}

// No passwords: name + email + institution identifies you. A returning
// email resumes that account (and refreshes name/institution/role); a new
// email creates one. The name entered here is what prints on the certificate.
router.post("/start", (req, res) => {
  const { name, email, institution } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Name is required" });
  if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: "A valid email is required" });

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();
  const cleanInstitution = String(institution || "").trim();
  const role = roleForEmail(cleanEmail);

  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(cleanEmail);
  if (user) {
    const institutionToStore = cleanInstitution || user.institution;
    db.prepare("UPDATE users SET name = ?, institution = ?, role = ? WHERE id = ?").run(cleanName, institutionToStore, role, user.id);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id);
  } else {
    const info = db
      .prepare("INSERT INTO users (name, email, institution, role) VALUES (?, ?, ?, ?)")
      .run(cleanName, cleanEmail, cleanInstitution, role);
    const userId = Number(info.lastInsertRowid);
    db.prepare("INSERT INTO progress (user_id) VALUES (?)").run(userId);
    user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

export default router;
