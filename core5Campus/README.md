# Core5Campus

Certification and training platform for teachers, faculty and school leaders.
Free, self-paced online courses with narrated lessons and a certificate on completion. React + Vite frontend, Node.js/Express API, PostgreSQL, PDF certificates with QR verification.

## Run it locally

Needs Node.js 18 or newer and PostgreSQL 14 or newer, with an empty database (e.g. `CREATE DATABASE core5campus;`).

```bash
npm run setup                      # installs backend + frontend
cp backend/.env.example backend/.env   # set DATABASE_URL to that database

npm run dev:api                    # terminal 1  ->  http://localhost:4100
npm run dev:web                    # terminal 2  ->  http://localhost:3006
```

The tables are created and seeded on first start.

| | |
|---|---|
| Site | http://localhost:3006 |
| Admin login | `admin@core5.local` / `ChangeMe@123` (set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before first start) |

## Production

```bash
npm run build      # builds frontend/dist
npm start          # API serves the site and /api on PORT
```

Or with Docker: `docker compose up -d --build` (set `PUBLIC_URL`, `JWT_SECRET` and admin values in `backend/.env` first).

## What is in the box

**Public site**
- Home page with a live certificate preview (type a name, see it on the certificate)
- Courses menu listing the five Technology & AI courses
- Five full course pages: Google Certified Educator, Google Certified Trainer, Advanced AI for Educators, AI for Educational Leadership, Professional Certificate in Online Teaching
- Each course page: overview, audience, outcomes, tools, syllabus accordion, certification path, what’s included, FAQs, enquiry form, syllabus PDF download behind a lead form
- School programme (group PD) request form
- Free webinars with seat reservation
- Public certificate verification by ID or QR code

**Learner area**
- Sign up / sign in (JWT)
- Enrol free in one click and learn at your own pace (no batches, fees or fixed dates)
- Course page with module checklist and final assessment (answers are marked on the server)
- Certificate issued automatically on passing, downloadable as PDF
- CPD hours tracker against the 50 hours a year expected under NEP 2020

**Admin panel** (`/admin`)
- Overview numbers, enquiries by course
- Enquiries: status pipeline, CSV export
- Enrolments: lesson progress, cancel, issue certificate manually
- Courses: visibility (published, coming soon, hidden)
- Certificates: download, revoke, restore
- Webinars: add, delete, see registrations

## Lessons

Every syllabus point is a lesson with a narrated slide lecture (read aloud by the browser, with captions and speed control), notes, a classroom example, a task, key takeaways and a two-question check. A module completes when all its lessons are done, which unlocks the final assessment.

| | |
|---|---|
| Lesson content | `backend/src/data/lessons/<course-slug>.js` (restart the API after editing) |
| Narration voice | Pre-generated MP3s in `backend/media/audio`, one per sentence, voice `af_heart` (Kokoro, runs offline). Lessons without audio fall back to the browser’s best natural voice. |
| Recorded videos | Admin → Lesson videos: paste a YouTube, Vimeo or .mp4 link per lesson |
| PowerPoint decks | Generated per module on download, with narration as speaker notes |
| New courses | `npm --prefix backend run lessons:generate -- --course <slug>` drafts lessons with a local Ollama model into `lessons/generated/`. Review before use. |

### Regenerating narration audio

After editing lesson text, generate audio for new or changed sentences (unchanged sentences are skipped). Run from `backend/`:

```bash
# one-time setup (Python 3.12)
py -3.12 -m venv .venv-tts
.venv-tts/Scripts/python -m pip install kokoro-onnx soundfile
mkdir .tts-models   # then download kokoro-v1.0.onnx and voices-v1.0.bin from
                    # https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0

# each time lesson text changes
node scripts/tts-manifest.js
.venv-tts/Scripts/python scripts/tts/generate_audio.py
```

It runs at roughly real time on a laptop CPU and can be stopped and resumed. To change voice, set `TTS_VOICE` (for example `bf_emma` for British English) for both the API and the manifest script, then regenerate.

## Where to change things

| To change | Edit |
|---|---|
| Brand name, email, phone, city | `frontend/src/site.js` |
| Colours and fonts | top of `frontend/src/styles.css` |
| Course copy, syllabus, FAQs, assessment questions | `backend/src/data/catalog.js`, then `npm run seed -- --refresh` |
| Publish status, webinars | Admin panel |
| Certificate layout and badges | `backend/src/services/certificates.js`, `backend/src/services/badge.js` (badge text and colour per course: `badge` in `catalog.js`) |

## Before you go live

1. Set `JWT_SECRET`, `PUBLIC_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` in `backend/.env`.
2. Replace the placeholder phone number in `frontend/src/site.js`.
3. Add the official Google for Education partner badge to the certificate only if your Google partner agreement entitles you to it.
4. Review the CPD hours on each course. They are starting values, not decisions.
5. Google's exam fees and formats are set by Google and have changed recently. The course pages point learners to Google's site for those rather than quoting numbers. Keep it that way or check them regularly.
6. Add your privacy policy and terms pages.

## Not included yet

- Emails (enquiry alerts, joining links, password reset). Hook an SMTP or WhatsApp provider into the routes in `backend/src/routes`.
- Video hosting and live-class links per session.
- GST invoices.

## API

```
GET  /api/catalog                          categories + courses
GET  /api/courses/:slug                    course detail (no answer key)
GET  /api/courses/:slug/syllabus.pdf
POST /api/enquiries                        any lead form
GET  /api/events        POST /api/events/:id/register
GET  /api/certificates/verify/:code        public verification

POST /api/auth/register | /login           GET/PATCH /api/auth/me
POST /api/enrollments                      enrol (free, instant)
GET  /api/me/enrollments | /:id            POST .../progress | .../assessment
GET  /api/me/certificates                  GET /api/certificates/:code/pdf

/api/admin/*                               overview, enquiries, enrollments, courses, lessons, certificates, events
```
