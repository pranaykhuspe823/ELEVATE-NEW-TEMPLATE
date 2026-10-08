import { Router } from 'express';
import { db } from '../db.js';
import { bad } from '../util.js';

const r = Router();

/** Server-to-server only, never reachable from a browser session -- gated on
 * a shared secret header instead of a learner's own JWT. Lets a trusted
 * partner app (e.g. Elevate's faculty dashboard) show someone's earned
 * certificates by email without them signing in here too. */
function requireServiceKey(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!process.env.SERVICE_KEY || key !== process.env.SERVICE_KEY) {
    return res.status(401).json({ error: 'Invalid or missing service key.' });
  }
  next();
}

r.get('/certificates', requireServiceKey, (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return bad(res, 'email is required.');
  const user = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (!user) return res.json({ certificates: [] });
  const certificates = db.prepare(`SELECT x.code, x.course_title, x.cert_title, x.cpd_hours, x.score, x.issued_at, c.slug
    FROM certificates x JOIN courses c ON c.id=x.course_id WHERE x.user_id=? AND x.status='valid' ORDER BY x.issued_at DESC`).all(user.id);
  res.json({ certificates });
});

export default r;
