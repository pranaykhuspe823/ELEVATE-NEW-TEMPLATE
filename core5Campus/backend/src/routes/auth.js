import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { signToken, requireAuth, USER_WITH_SCHOOL } from '../middleware/auth.js';
import { str, isEmail, isPhone, bad, wrap } from '../util.js';

const r = Router();
const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, phone: u.phone, institution: u.institution, role: u.role,
  // Set for teachers signed in with their Elevate faculty account
  linked: !!u.elevate_user_id, college_name: u.college_name || null,
});
const loadUser = (id) => db.get(USER_WITH_SCHOOL + ' WHERE u.id=?', id);

// Accounts that sign in with their Elevate password store this instead of a
// hash, so a Core5Campus-side password can never be used for them.
const LINKED_PASSWORD = '!elevate';

/** The Elevate faculty / TPO account for this email, if there is one. Their
 * Elevate login is the only way in, which is what ties their certificates
 * to their school. */
const elevateStaff = (email) => db.get(
  `SELECT id, name, "passwordHash" AS password_hash FROM public.users
   WHERE email=? AND role IN ('FACULTY','COLLEGE_ADMIN')`, email);

r.post('/register', wrap(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120), email = str(b.email, 160).toLowerCase(), phone = str(b.phone, 20), password = typeof b.password === 'string' ? b.password : '';
  if (name.length < 2) return bad(res, 'Enter your full name as it should appear on certificates.');
  if (!isEmail(email)) return bad(res, 'Enter a valid email address.');
  if (phone && !isPhone(phone)) return bad(res, 'Enter a valid phone number, or leave it blank.');
  if (password.length < 8) return bad(res, 'Use a password with at least 8 characters.');
  if (await elevateStaff(email)) return bad(res, 'This email belongs to an Elevate faculty account. Sign in with your Elevate email and password instead.', 409);
  if (await db.get('SELECT 1 FROM users WHERE email=?', email)) return bad(res, 'An account with this email already exists. Sign in instead.', 409);
  const { rows: [created] } = await db.run('INSERT INTO users (name, email, phone, institution, password_hash) VALUES (?,?,?,?,?) RETURNING id',
    name, email, phone, str(b.institution, 160), bcrypt.hashSync(password, 10));
  const user = await loadUser(created.id);
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

r.post('/login', wrap(async (req, res) => {
  const email = str(req.body?.email, 160).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const wrong = () => bad(res, 'Email or password is incorrect.', 401);

  const staff = await elevateStaff(email);
  if (staff) {
    if (!staff.password_hash) return bad(res, 'Finish setting up your Elevate faculty account first, then sign in here with the same email and password.', 401);
    if (!bcrypt.compareSync(password, staff.password_hash)) return wrong();
    // First sign-in creates the Core5Campus profile; an older Core5Campus
    // account with the same email is linked (its earlier certificates keep
    // college_id NULL -- they were earned before joining the school).
    let user = await db.get('SELECT id, role FROM users WHERE elevate_user_id=?', staff.id)
      || await db.get('SELECT id, role FROM users WHERE email=?', email);
    if (user?.role === 'admin') return bad(res, 'This email is used by a Core5Campus admin account.', 409);
    if (user) {
      await db.run('UPDATE users SET elevate_user_id=?, password_hash=? WHERE id=?', staff.id, LINKED_PASSWORD, user.id);
    } else {
      const name = (staff.name || '').trim() || email.split('@')[0];
      ({ rows: [user] } = await db.run('INSERT INTO users (name, email, password_hash, elevate_user_id) VALUES (?,?,?,?) RETURNING id',
        name, email, LINKED_PASSWORD, staff.id));
    }
    const full = await loadUser(user.id);
    return res.json({ token: signToken(full), user: publicUser(full) });
  }

  const user = await db.get('SELECT * FROM users WHERE email=?', email);
  if (user?.elevate_user_id) {
    return bad(res, 'Your Elevate faculty access has ended. Ask the Core5Campus admin to reset your password.', 401);
  }
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return wrong();
  const full = await loadUser(user.id);
  res.json({ token: signToken(full), user: publicUser(full) });
}));

r.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

r.patch('/me', requireAuth, wrap(async (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 120) || req.user.name;
  if (name.length < 2) return bad(res, 'Enter your full name.');
  if (typeof b.new_password === 'string' && b.new_password) {
    if (req.user.elevate_user_id) return bad(res, 'You sign in with your Elevate account. Change your password in Elevate.');
    if (b.new_password.length < 8) return bad(res, 'Use a password with at least 8 characters.');
    const row = await db.get('SELECT password_hash FROM users WHERE id=?', req.user.id);
    if (!bcrypt.compareSync(String(b.current_password || ''), row.password_hash)) return bad(res, 'Current password is incorrect.', 401);
    await db.run('UPDATE users SET password_hash=? WHERE id=?', bcrypt.hashSync(b.new_password, 10), req.user.id);
  }
  await db.run('UPDATE users SET name=?, phone=?, institution=? WHERE id=?',
    name, str(b.phone, 20), str(b.institution, 160), req.user.id);
  res.json({ user: publicUser(await loadUser(req.user.id)) });
}));

export default r;
