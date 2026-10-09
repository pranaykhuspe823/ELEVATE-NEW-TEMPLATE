import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { categories, courses, upcoming, events } from './data/catalog.js';

const contentOf = (c) => JSON.stringify({
  summary: c.summary, audience: c.audience, highlights: c.highlights, outcomes: c.outcomes, tools: c.tools,
  modules: c.modules, path: c.path, includes: c.includes, faqs: c.faqs, external_certs: c.external_certs, quiz: c.quiz,
});

export async function seed({ refresh = false } = {}) {
  await db.tx(async (tx) => {
    const catId = {};
    for (const c of categories) {
      await tx.run('INSERT INTO categories (slug, name, sort) VALUES (?,?,?) ON CONFLICT DO NOTHING', c.slug, c.name, c.sort);
      catId[c.slug] = (await tx.get('SELECT id FROM categories WHERE slug=?', c.slug)).id;
    }
    for (const [i, c] of courses.entries()) {
      const existing = await tx.get('SELECT id FROM courses WHERE slug=?', c.slug);
      if (!existing) {
        await tx.run(`INSERT INTO courses
          (slug, category_id, title, short, tagline, status, fee_live, fee_self, duration_weeks, cpd_hours, pass_mark, cert_title, cert_prefix, content, sort)
          VALUES (?,?,?,?,?,'published',?,?,?,?,?,?,?,?,?)`,
          c.slug, catId[c.category], c.title, c.short, c.tagline, null, null, null, c.cpd_hours,
          c.pass_mark, c.cert_title, c.cert_prefix, contentOf(c), i + 1);
      } else if (refresh) {
        await tx.run(`UPDATE courses SET title=?, short=?, tagline=?, duration_weeks=NULL, fee_live=NULL, fee_self=NULL, cpd_hours=?, pass_mark=?, cert_title=?, cert_prefix=?, content=? WHERE id=?`,
          c.title, c.short, c.tagline, c.cpd_hours, c.pass_mark, c.cert_title, c.cert_prefix, contentOf(c), existing.id);
      }
    }
    // Courses are free and self-paced: no batches, fees or fixed durations
    await tx.exec("DELETE FROM batches; UPDATE courses SET fee_live=NULL, fee_self=NULL, duration_weeks=NULL; UPDATE enrollments SET status='active', amount=0 WHERE status='pending'; UPDATE certificates SET cert_title=replace(cert_title, 'Core5 ', 'Core5Campus ');");
    // Remove placeholder courses and categories that are no longer in the catalogue (never courses with enrolments)
    const keepCourses = [...courses, ...upcoming].map((c) => c.slug);
    await tx.run(`DELETE FROM courses WHERE status='upcoming' AND slug NOT IN (${keepCourses.map(() => '?').join(',')})
      AND id NOT IN (SELECT course_id FROM enrollments)`, ...keepCourses);
    await tx.run(`DELETE FROM categories WHERE slug NOT IN (${categories.map(() => '?').join(',')})
      AND id NOT IN (SELECT category_id FROM courses)`, ...categories.map((c) => c.slug));
    for (const [i, c] of upcoming.entries()) {
      await tx.run(`INSERT INTO courses (slug, category_id, title, short, tagline, status, content, sort) VALUES (?,?,?,?,?,'upcoming','{}',?)
        ON CONFLICT DO NOTHING`, c.slug, catId[c.category], c.title, c.short, c.tagline, 100 + i);
    }
    if ((await tx.get('SELECT COUNT(*) n FROM events')).n === 0) {
      for (const e of events) {
        await tx.run('INSERT INTO events (title, description, starts_at, duration_min, speaker) VALUES (?,?,?,?,?)',
          e.title, e.description, e.starts_at, e.duration_min, e.speaker);
      }
    }
    if (!(await tx.get("SELECT id FROM users WHERE role='admin'"))) {
      const email = (process.env.ADMIN_EMAIL || 'admin@core5.local').toLowerCase();
      const password = process.env.ADMIN_PASSWORD || 'ChangeMe@123';
      await tx.run("INSERT INTO users (name, email, password_hash, role) VALUES ('Core5Campus Admin', ?, ?, 'admin')",
        email, bcrypt.hashSync(password, 10));
      console.log(`[seed] Admin created: ${email} (change the password after first login)`);
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await seed({ refresh: process.argv.includes('--refresh') });
  console.log('[seed] Done.');
  process.exit(0);
}
