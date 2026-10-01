import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "app.db"));

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    institution TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'faculty',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS progress (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    done TEXT NOT NULL DEFAULT '[]',
    checks TEXT NOT NULL DEFAULT '{}',
    tools TEXT NOT NULL DEFAULT '{}',
    current INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exam_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    question_ids TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exam_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    question_ids TEXT NOT NULL,
    score INTEGER NOT NULL,
    passed INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    exam_attempt_id INTEGER NOT NULL REFERENCES exam_attempts(id),
    name_on_cert TEXT NOT NULL DEFAULT '',
    institution_on_cert TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL,
    issued_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
