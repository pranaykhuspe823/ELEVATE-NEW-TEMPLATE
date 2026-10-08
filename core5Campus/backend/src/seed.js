import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { categories, courses, upcoming, events } from './data/catalog.js';

const contentOf = (c) => JSON.stringify({
  summary: c.summary, audience: c.audience, highlights: c.highlights, outcomes: c.outcomes, tools: c.tools,
  modules: c.modules, path: c.path, includes: c.includes, faqs: c.faqs, external_certs: c.external_certs, quiz: c.quiz,
});

export function seed({ refresh = false } = {}) {
  const tx = db.transaction(() => {
    const catId = {};
    for (const c of categories) {
      db.prepare('INSERT OR IGNORE INTO categories (slug, name, sort) VALUES (?,?,?)').run(c.slug, c.name, c.sort);
      catId[c.slug] = db.prepare('SELECT id FROM categories WHERE slug=?').get(c.slug).id;
    }
    courses.forEach((c, i) => {
      const existing = db.prepare('SELECT id FROM courses WHERE slug=?').get(c.slug);
      if (!existing) {
        db.prepare(`INSERT INTO courses
          (slug, category_id, title, short, tagline, status, fee_live, fee_self, duration_weeks, cpd_hours, pass_mark, cert_title, cert_prefix, content, sort)
          VALUES (?,?,?,?,?,'published',?,?,?,?,?,?,?,?,?)`).run(
          c.slug, catId[c.category], c.title, c.short, c.tagline, null, null, null, c.cpd_hours,
          c.pass_mark, c.cert_title, c.cert_prefix, contentOf(c), i + 1);
      } else if (refresh) {
        db.prepare(`UPDATE courses SET title=?, short=?, tagline=?, duration_weeks=NULL, fee_live=NULL, fee_self=NULL, cpd_hours=?, pass_mark=?, cert_title=?, cert_prefix=?, content=? WHERE id=?`)
          .run(c.title, c.short, c.tagline, c.cpd_hours, c.pass_mark, c.cert_title, c.cert_prefix, contentOf(c), existing.id);
      }
    });
    // Courses are free and self-paced: no batches, fees or fixed durations
    db.exec("DELETE FROM batches; UPDATE courses SET fee_live=NULL, fee_self=NULL, duration_weeks=NULL; UPDATE enrollments SET status='active', amount=0 WHERE status='pending'; UPDATE certificates SET cert_title=replace(cert_title, 'Core5 ', 'Core5Campus ');");
    // Remove placeholder courses and categories that are no longer in the catalogue (never courses with enrolments)
    const keepCourses = [...courses, ...upcoming].map((c) => c.slug);
    db.prepare(`DELETE FROM courses WHERE status='upcoming' AND slug NOT IN (${keepCourses.map(() => '?').join(',')})
      AND id NOT IN (SELECT course_id FROM enrollments)`).run(...keepCourses);
    db.prepare(`DELETE FROM categories WHERE slug NOT IN (${categories.map(() => '?').join(',')})
      AND id NOT IN (SELECT category_id FROM courses)`).run(...categories.map((c) => c.slug));
    upcoming.forEach((c, i) => {
      db.prepare(`INSERT OR IGNORE INTO courses (slug, category_id, title, short, tagline, status, content, sort) VALUES (?,?,?,?,?,'upcoming','{}',?)`)
        .run(c.slug, catId[c.category], c.title, c.short, c.tagline, 100 + i);
    });
    if (db.prepare('SELECT COUNT(*) n FROM events').get().n === 0) {
      for (const e of events) {
        db.prepare('INSERT INTO events (title, description, starts_at, duration_min, speaker) VALUES (?,?,?,?,?)')
          .run(e.title, e.description, e.starts_at, e.duration_min, e.speaker);
      }
    }
    if (!db.prepare("SELECT id FROM users WHERE role='admin'").get()) {
      const email = (process.env.ADMIN_EMAIL || 'admin@core5.local').toLowerCase();
      const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
      db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES ('Core5Campus Admin', ?, ?, 'admin')")
        .run(email, bcrypt.hashSync(password, 10));
      console.log(`[seed] Admin created: ${email} (change the password after first login)`);
    }
  });
  tx();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed({ refresh: process.argv.includes('--refresh') });
  console.log('[seed] Done.');
}
