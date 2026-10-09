import pg from 'pg';

// COUNT(*) and other bigint results come back as strings by default; every
// bigint here is a small count, so read them as plain numbers.
pg.types.setTypeParser(20, (v) => parseInt(v, 10));

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set (a PostgreSQL connection string).');
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Queries are written with SQLite-style "?" placeholders; Postgres wants $1, $2, ...
// Placeholders inside quoted SQL strings are left alone.
const toPg = (sql) => {
  let n = 0, quoted = false, out = '';
  for (const ch of sql) {
    if (ch === "'") quoted = !quoted;
    out += ch === '?' && !quoted ? `$${++n}` : ch;
  }
  return out;
};

const api = (q) => ({
  /** First row, or undefined. */
  get: async (sql, ...params) => (await q(toPg(sql), params)).rows[0],
  all: async (sql, ...params) => (await q(toPg(sql), params)).rows,
  /** Add "RETURNING id" to an INSERT to get the new row back in `rows`. */
  run: async (sql, ...params) => {
    const r = await q(toPg(sql), params);
    return { changes: r.rowCount, rows: r.rows };
  },
  /** Several statements at once, no parameters. */
  exec: async (sql) => { await q(sql); },
});

export const db = {
  ...api((text, params) => pool.query(text, params)),
  /** Run fn(tx) in a transaction; tx has the same get/all/run/exec. */
  async tx(fn) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(api((text, params) => client.query(text, params)));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  },
};

// Timestamps stay TEXT in 'YYYY-MM-DD HH:MM:SS' UTC, the format the
// certificate and Credly code parse.
const NOW = "to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')";

await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  institution TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','admin')),
  created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
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
  sort INTEGER NOT NULL DEFAULT 0,
  credly_template_id TEXT
);
CREATE TABLE IF NOT EXISTS batches (
  id SERIAL PRIMARY KEY,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  start_date TEXT NOT NULL,
  schedule TEXT,
  label TEXT,
  seats INTEGER NOT NULL DEFAULT 40
);
CREATE TABLE IF NOT EXISTS enquiries (
  id SERIAL PRIMARY KEY,
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
  created_at TEXT NOT NULL DEFAULT ${NOW}
);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TEXT NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 60,
  speaker TEXT,
  join_url TEXT
);
CREATE TABLE IF NOT EXISTS event_registrations (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  institution TEXT,
  created_at TEXT NOT NULL DEFAULT ${NOW},
  UNIQUE (event_id, email)
);
CREATE TABLE IF NOT EXISTS enrollments (
  id SERIAL PRIMARY KEY,
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
  created_at TEXT NOT NULL DEFAULT ${NOW},
  -- Lesson-level progress ("module.lesson" keys)
  lessons TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS certificates (
  id SERIAL PRIMARY KEY,
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
  issued_at TEXT NOT NULL DEFAULT ${NOW},
  -- Credly badge issued for this certificate
  credly_badge_id TEXT,
  credly_status TEXT NOT NULL DEFAULT 'none', -- none | sent | failed | skipped
  credly_error TEXT,
  credly_sent_at TEXT
);
-- Optional recorded video per lesson
CREATE TABLE IF NOT EXISTS lesson_media (
  course_slug TEXT NOT NULL,
  module INTEGER NOT NULL,
  lesson INTEGER NOT NULL,
  video_url TEXT NOT NULL,
  PRIMARY KEY (course_slug, module, lesson)
);
CREATE INDEX IF NOT EXISTS idx_enroll_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enq_status ON enquiries(status);
`);
