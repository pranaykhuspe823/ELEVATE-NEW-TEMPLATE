import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db.js';

let secret = process.env.JWT_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] JWT_SECRET not set. Using a temporary secret; sign-ins reset on restart.');
}

/** A Core5Campus user plus their school, read live from Elevate: a teacher
 * linked to an Elevate FACULTY / COLLEGE_ADMIN account belongs to that
 * account's college; everyone else has college_id NULL (no school). */
export const USER_WITH_SCHOOL = `SELECT u.id, u.name, u.email, u.phone, u.institution, u.role, u.elevate_user_id,
    ev."collegeId" AS college_id, col.name AS college_name
  FROM users u
  LEFT JOIN public.users ev ON ev.id = u.elevate_user_id AND ev.role IN ('FACULTY','COLLEGE_ADMIN')
  LEFT JOIN public.colleges col ON col.id = ev."collegeId"`;

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, secret, { expiresIn: '7d' });

export async function requireAuth(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return res.status(401).json({ error: 'Your session expired. Sign in again.' });
  }
  try {
    const user = await db.get(USER_WITH_SCHOOL + ' WHERE u.id=?', payload.sub);
    if (!user) return res.status(401).json({ error: 'Account not found. Sign in again.' });
    req.user = user;
  } catch (err) {
    return next(err); // a database failure is a server error, not an expired session
  }
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, (err) => {
    if (err) return next(err);
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only.' });
    next();
  });
}
