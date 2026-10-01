import { Router } from "express";
import { db } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();

router.get("/certificate", requireAuth, (req, res) => {
  const cert = db.prepare("SELECT * FROM certificates WHERE user_id = ?").get(req.userId);
  if (!cert) return res.status(404).json({ error: "No certificate yet. Pass the final exam first." });
  res.json({ certificate: cert });
});

router.put("/certificate", requireAuth, (req, res) => {
  const { name, institution } = req.body || {};
  const cert = db.prepare("SELECT * FROM certificates WHERE user_id = ?").get(req.userId);
  if (!cert) return res.status(404).json({ error: "No certificate yet. Pass the final exam first." });

  const nextName = name !== undefined ? String(name).trim() : cert.name_on_cert;
  const nextInstitution = institution !== undefined ? String(institution).trim() : cert.institution_on_cert;
  if (!nextName) return res.status(400).json({ error: "Name cannot be empty" });

  db.prepare("UPDATE certificates SET name_on_cert = ?, institution_on_cert = ? WHERE id = ?").run(nextName, nextInstitution, cert.id);
  res.json({ certificate: db.prepare("SELECT * FROM certificates WHERE id = ?").get(cert.id) });
});

// Public verification — no auth. Anyone with a certificate id (e.g. from a QR
// code) can confirm it's genuine without seeing anything else about the account.
router.get("/verify/:id", (req, res) => {
  const cert = db.prepare("SELECT * FROM certificates WHERE id = ?").get(req.params.id.trim());
  if (!cert) return res.status(404).json({ valid: false });
  res.json({
    valid: true,
    id: cert.id,
    name: cert.name_on_cert,
    institution: cert.institution_on_cert,
    score: cert.score,
    issuedAt: cert.issued_at,
    course: "Faculty Placement Champion",
    issuer: "Core5 Systems and Services",
  });
});

export default router;
