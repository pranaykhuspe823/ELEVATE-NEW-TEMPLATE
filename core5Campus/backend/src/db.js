import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve(process.env.DB_FILE || './data/core5-educators.db');
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new Database(file);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  institution TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','admin')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  title TEXT NOT NULL,
  short TEXT,
  tagline TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','upcoming','hidden')),
  fee_live INTEGER,
  fee_self INTEGER,
  duration_weeks INTEGER,
  cpd_hours INTEGER,
  pass_mark INTEGER NOT NULL DEFAULT 65,
  cert_title TEXT,
  cert_prefix TEXT,
  content TEXT NOT NULL DEFAULT '{}',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  schedule TEXT,
  label TEXT,
  seats INTEGER NOT NULL DEFAULT 40
);
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL DEFAULT 'enquiry',
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT,
  institution TEXT,
  course_slug TEXT,
  message TEXT,
  meta TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','closed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  speaker TEXT,
  join_url TEXT
);
CREATE TABLE IF NOT EXISTS event_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  institution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (event_id, email)
);
CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  batch_id INTEGER REFERENCES batches(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'live' CHECK (mode IN ('live','self')),
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','cancelled')),
  order_id TEXT,
  payment_ref TEXT,
  progress TEXT NOT NULL DEFAULT '[]',
  quiz_score INTEGER,
  quiz_attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  course_id INTEGER NOT NULL REFERENCES courses(id),
  enrollment_id INTEGER REFERENCES enrollments(id),
  holder_name TEXT NOT NULL,
  course_title TEXT NOT NULL,
  cert_title TEXT NOT NULL,
  cpd_hours INTEGER,
  score INTEGER,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','revoked')),
  issued_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_enroll_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enq_status ON enquiries(status);
`);

// Lesson-level progress ("module.lesson" keys) and optional recorded videos per lesson.
if (!db.prepare('PRAGMA table_info(enrollments)').all().some((c) => c.name === 'lessons')) {
  db.exec("ALTER TABLE enrollments ADD COLUMN lessons TEXT NOT NULL DEFAULT '[]'");
}
db.exec(`
CREATE TABLE IF NOT EXISTS lesson_media (
  course_slug TEXT NOT NULL,
  module INTEGER NOT NULL,
  lesson INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  PRIMARY KEY (course_slug, module, lesson)
);
`);

// Credly: badge template per course, and the Credly badge issued for each certificate.
const addColumn = (table, name, def) => {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${def}`);
};
addColumn('courses', 'credly_template_id', 'TEXT');
addColumn('certificates', 'credly_badge_id', 'TEXT');
addColumn('certificates', 'credly_status', "TEXT NOT NULL DEFAULT 'none'"); // none | sent | failed | skipped
addColumn('certificates', 'credly_error', 'TEXT');
addColumn('certificates', 'credly_sent_at', 'TEXT');
