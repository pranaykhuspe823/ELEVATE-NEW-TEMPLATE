import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { str, isEmail, isPhone, bad, wrap } from '../util.js';

const r = Router();
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, institution: u.institution, role: u.role });

r.post('/register', wrap(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120), email = str(b.email, 160).toLowerCase(), phone = str(b.phone, 20), password = typeof b.password === 'string' ? b.password : '';
  if (name.length < 2) return bad(res, 'Enter your full name as it should appear on certificates.');
  if (!isEmail(email)) return bad(res, 'Enter a valid email address.');
  if (phone && !isPhone(phone)) return bad(res, 'Enter a valid phone number, or leave it blank.');
  if (password.length < 8) return bad(res, 'Use a password with at least 8 characters.');
  if (await db.get('SELECT 1 FROM users WHERE email=?', email)) return bad(res, 'An account with this email already exists. Sign in instead.', 409);
  const { rows: [user] } = await db.run('INSERT INTO users (name, email, phone, institution, password_hash) VALUES (?,?,?,?,?) RETURNING *',
    name, email, phone, str(b.institution, 160), bcrypt.hashSync(password, 10));
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

r.post('/login', wrap(async (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await db.get('SELECT * FROM users WHERE email=?', email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return bad(res, 'Email or password is incorrect.', 401);
  res.json({ token: signToken(user), user: publicUser(user) });
}));

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.patch('/me', requireAuth, wrap(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120) || req.user.name;
  if (name.length < 2) return bad(res, 'Enter your full name.');
  await db.run('UPDATE users SET name=?, phone=?, institution=? WHERE id=?',
    name, str(b.phone, 20), str(b.institution, 160), req.user.id);
  if (typeof b.new_password === 'string' && b.new_password) {
    if (b.new_password.length < 8) return bad(res, 'Use a password with at least 8 characters.');
    const row = await db.get('SELECT password_hash FROM users WHERE id=?', req.user.id);
    if (!bcrypt.compareSync(String(b.current_password || ''), row.password_hash)) return bad(res, 'Current password is incorrect.', 401);
    await db.run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(b.new_password, 10), req.user.id);
  }
  res.json({ user: await db.get('SELECT id, name, email, phone, institution, role FROM users WHERE id=?', req.user.id) });
}));

export default r;
