# Faculty Placement Champion — Core5 Academy

Certification course for faculty: 9 video modules, a checkpoint per module,
a 10-question final exam (drawn from a 20-question bank, pass mark 7/10) and a
Core5 Systems and Services certificate. Progress, exam grading and certificate
issuance are backed by a real API — see [server/](server/). Getting started is
one form (name, email, institution) and no password.

## Run it

Two processes: the API (`server/`) and the frontend (root). In two terminals:

```bash
# 1. Backend — http://localhost:8787
cd server
npm install
copy .env.example .env     # (or `cp` on macOS/Linux) — edit JWT_SECRET before real use
npm start                   # or `npm run dev` to auto-restart on changes

# 2. Frontend — http://localhost:5173, proxies /api to the backend above
npm install
npm run dev
```

```bash
npm run build      # production build -> dist/ (index.html + verify.html)
npm run preview    # serve the build (still needs the backend running separately)
```

No backend, no accounts? Open `standalone/faculty-placement-champion.html`
directly in a browser — it's the offline, localStorage-only version of the
course in one file, kept for demos and situations with no server available.

## Structure

```
index.html                    page shell (course player)
verify.html                   public certificate verification page
src/css/styles.css            all styling (light + dark theme, print styles for the certificate)
src/js/course-data.js         ALL content: modules, scenes, narration, takeaways, checklists, checkpoints, exam bank
src/js/app.js                 player, gating, progress sync, exam, certificate logic
src/js/api.js                 thin fetch wrapper around the backend API + auth token storage
src/js/auth-view.js           the "start the course" name/email/institution form
src/js/verify.js              logic for verify.html
scripts/export-narration.mjs  exports narration + exam bank to ./export (JSON/CSV)
standalone/                   single-file, backend-free version
server/                       Express + SQLite API — identity, progress, server-graded exam, certificates
```

## Backend (`server/`)

- **Identity, no password** — `POST /api/auth/start` takes `{name, email, institution}`. A new email creates an account; an email that's already registered just resumes it (name/institution refreshed from what was typed). The name entered here is what's printed on the certificate. This trades account security for zero-friction signup — anyone who knows a colleague's email can resume their session, which is fine for an internal training tool but worth knowing.
- **Progress** — `done`/`checks`/`tools`/`current` synced per user (`GET`/`PUT /api/progress`), replacing localStorage.
- **Exam** — `POST /api/exam/start` hands the client 10 questions with no answer key; `POST /api/exam/submit` grades server-side against the question bank in `src/js/course-data.js` (imported directly — one source of truth) and returns explanations only after grading.
- **Certificates** — issued once per user on their first passing attempt, with a unique ID. `GET`/`PUT /api/certificate` (authenticated) lets a user fix the name/institution printed on it. `GET /api/verify/:id` is public — no auth — for QR-code / link verification (`verify.html`).
- **Admin** — accounts whose email is listed in `ADMIN_EMAILS` get the `admin` role automatically and see a "Faculty progress" tab in the nav: every faculty account's module progress, best exam score and certificate status (`GET /api/admin/faculty`, 403 for non-admins).
- **Storage** — SQLite via Node's built-in `node:sqlite` (no native build step). The DB file lives at `server/data/app.db` (gitignored).

See `server/.env.example` for configuration (`PORT`, `JWT_SECRET`, `CORS_ORIGIN`, `ADMIN_EMAILS`).

## Editing content

Everything lives in `src/js/course-data.js`:

- `COURSE[]` — one object per module: `title, sub, mins, intro, takeaways[], toolkit[], check{q,o[],a}, scenes[]`
- each scene: `tag, title, glyph (emoji), points[] (on-screen chips), say (narration + caption)`
- `BANK[]` — exam questions `{q, o[], a (correct index), e (explanation)}`
- `EXAM_N`, `PASS` — questions per attempt and pass mark

The backend imports `COURSE`/`BANK` straight from this file, so content edits apply to both the player and the exam automatically.

## Making real videos

```bash
npm run export:narration
```

Produces `export/narration.csv` (one row per scene). Feed it to your TTS / AI-avatar
tool, then replace the scene player in `app.js` with a `<video>` per module.

## Before going to production

- Set a strong, random `JWT_SECRET` in `server/.env` — the server refuses to start with the default when `NODE_ENV=production`.
- Put the SQLite file (`server/data/app.db`) on a persistent volume/backup schedule, or swap in Postgres if you outgrow single-file SQLite.
- Put the API behind HTTPS and set `CORS_ORIGIN` to your real frontend origin.
- **Voice** uses the browser's Speech Synthesis API, so quality varies by device.
- Offer rules differ per institute — add a "Your institute's policy" page per client.
