// Credly: issue a digital badge to the learner's registered email whenever a certificate is issued.
// Needs a Credly issuer organisation (https://info.credly.com/). Set in backend/.env:
//   CREDLY_ORG_ID      organisation ID from Credly
//   CREDLY_API_TOKEN   organisation authorization token from Credly
//   CREDLY_SANDBOX     "true" to use Credly's sandbox while testing
// Each course needs its Credly badge template ID (Admin > Courses).
// Credly then emails the learner, who accepts the badge into their Credly account.
import { db } from '../db.js';

export const credlyConfigured = () => Boolean(process.env.CREDLY_ORG_ID && process.env.CREDLY_API_TOKEN);
const base = () => (process.env.CREDLY_SANDBOX === 'true' ? 'https://sandbox-api.credly.com' : 'https://api.credly.com');
const publicUrl = () => (process.env.PUBLIC_URL || 'http://localhost:3006').replace(/\/$/, '');

const save = (id, fields) => {
  const keys = Object.keys(fields);
  db.prepare(`UPDATE certificates SET ${keys.map((k) => `${k}=?`).join(', ')} WHERE id=?`).run(...keys.map((k) => fields[k]), id);
};

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/);
  if (parts.length === 1) return [parts[0] || 'Learner', parts[0] || 'Learner']; // Credly requires both names
  return [parts.slice(0, -1).join(' '), parts.at(-1)];
}

async function post(body) {
  const res = await fetch(`${base()}/v1/organizations/${process.env.CREDLY_ORG_ID}/badges`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.CREDLY_API_TOKEN}:`).toString('base64')}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/** Send the Credly badge for a certificate. Never throws; the result is stored on the certificate. */
export async function sendToCredly(certId) {
  const cert = db.prepare(`SELECT c.*, u.email, co.credly_template_id FROM certificates c
    JOIN users u ON u.id=c.user_id JOIN courses co ON co.id=c.course_id WHERE c.id=?`).get(certId);
  if (!cert || cert.status !== 'valid') return;
  if (!credlyConfigured()) return save(cert.id, { credly_status: 'skipped', credly_error: 'Credly is not connected (CREDLY_ORG_ID / CREDLY_API_TOKEN not set).' });
  if (!cert.credly_template_id) return save(cert.id, { credly_status: 'skipped', credly_error: 'No Credly badge template ID set for this course (Admin > Courses).' });

  const [first, last] = splitName(cert.holder_name);
  const body = {
    badge_template_id: cert.credly_template_id,
    recipient_email: cert.email,
    issued_to_first_name: first,
    issued_to_last_name: last,
    issued_at: new Date(cert.issued_at.replace(' ', 'T') + 'Z').toISOString(),
    issuer_earner_id: cert.code,
    duplicate_behavior: 'replace',
    evidence: [{ type: 'UrlEvidence', name: 'Certificate verification', url: `${publicUrl()}/verify/${cert.code}`, description: `Certificate ID ${cert.code}` }],
  };
  try {
    let r = await post(body);
    // If Credly rejects the evidence block, issue the badge without it rather than not at all
    if (r.status === 422 && JSON.stringify(r.data).toLowerCase().includes('evidence')) { delete body.evidence; r = await post(body); }
    if (r.ok) {
      save(cert.id, { credly_status: 'sent', credly_badge_id: r.data?.data?.id || null, credly_error: null, credly_sent_at: new Date().toISOString() });
    } else {
      const msg = r.data?.data?.message || r.data?.message || (r.data?.data?.errors || []).map((e) => e.message || e).join('; ') || `HTTP ${r.status}`;
      save(cert.id, { credly_status: 'failed', credly_error: `Credly: ${String(msg).slice(0, 400)}` });
    }
  } catch (e) {
    save(cert.id, { credly_status: 'failed', credly_error: `Could not reach Credly: ${e.message}` });
  }
}
