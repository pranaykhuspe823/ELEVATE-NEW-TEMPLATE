import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { db } from '../db.js';

let secret = process.env.JWT_SECRET;
if (!secret) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  secret = crypto.randomBytes(32).toString('hex');
  console.warn('[auth] JWT_SECRET not set. Using a temporary secret; sign-ins reset on restart.');
}

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
    const user = await db.get('SELECT id, name, email, phone, institution, role FROM users WHERE id=?', payload.sub);
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
