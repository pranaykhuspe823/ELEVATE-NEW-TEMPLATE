import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { bad, str, wrap } from '../util.js';
import { certificatePdf } from '../services/certificates.js';

const r = Router();

/** Server-to-server only, never reachable from a browser session -- gated on
 * a shared secret header instead of a learner's own JWT. Used by Elevate
 * (same database) to hand a faculty member their certificate PDF without
 * them signing in here too. */
function requireServiceKey(req, res, next) {
  const key = Buffer.from(String(req.headers['x-service-key'] || ''));
  const expected = Buffer.from(process.env.SERVICE_KEY || '');
  // Constant-time compare, so the key can't be guessed byte by byte from response timing.
  if (!expected.length || key.length !== expected.length || !crypto.timingSafeEqual(key, expected)) {
    return res.status(401).json({ error: 'Invalid or missing service key.' });
  }
  next();
}

/** A certificate PDF for Elevate's "download certificate" button. Elevate
 * passes the Elevate account it's acting for; the certificate is only
 * returned if it belongs to the Core5Campus profile linked to that account. */
r.get('/certificates/:code/pdf', requireServiceKey, wrap(async (req, res) => {
  const code = str(req.params.code, 40).toUpperCase();
  const owner = str(req.query.elevate_user_id, 64);
  if (!code || !owner) return bad(res, 'Certificate code and elevate_user_id are required.');
  const cert = await db.get(`SELECT x.* FROM certificates x JOIN users u ON u.id=x.user_id
    WHERE x.code=? AND u.elevate_user_id=?`, code, owner);
  if (!cert) return bad(res, 'Certificate not found.', 404);
  if (cert.status !== 'valid') return bad(res, 'This certificate has been revoked.', 410);
  await certificatePdf(cert, res);
}));

export default r;
