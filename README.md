# Elevate — Resume Intelligence Platform

Monorepo: `frontend/` (React + Vite + Tailwind), `backend/` (Node + Express + Prisma/PostgreSQL), `ml-service/` (Python + FastAPI).

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (with an empty database, e.g. `CREATE DATABASE elevate;`)
- Python 3.10+ (3.12 recommended)
- [Ollama](https://ollama.com) — used for most LLM calls (field analysis, ATS scoring, test/course generation). Free, runs locally.
- A free [Groq](https://console.groq.com) API key — used only for the resume-parsing step (fast structuring of the raw upload).
- A GCC/G++ toolchain (e.g. [WinLibs](https://winlibs.com) on Windows, or `build-essential` on Linux) — required for the C/C++ coding-question sandbox. Not needed if you don't care about that feature.

## Setup

```bash
# Ollama
ollama pull llama3.1:8b

# backend
cd backend
npm install
cp .env.example .env     # set DATABASE_URL to your Postgres DB; fill in GROQ_API_KEY, and GCC_PATH/GPP_PATH if gcc/g++ aren't on PATH
npx prisma migrate deploy   # creates the tables in that database

# ml-service
cd ../ml-service
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # Windows; use bin/pip on macOS/Linux

# frontend
cd ../frontend
npm install
```

## Run (four things running: Ollama + three terminals)

```bash
ollama serve                     # if not already running as a service

cd backend && npm run dev        # http://localhost:4000
cd ml-service && ./.venv/Scripts/uvicorn app.main:app --reload --port 8001
cd frontend && npm run dev       # http://localhost:5173
```

Open `http://localhost:5173/` — that's the landing page. "Analyze my resume" takes you to `/upload`.

## Design reference

`design/elevate-website-layout.html` is the static wireframe the frontend's design tokens (colors, typography, spacing) are based on. The live landing page (`frontend/src/pages/LandingPage.tsx`) is a scoped React port of it.

## LLM provider

`generateStructured()` in `backend/src/lib/llm.ts` defaults to whatever `LLM_PROVIDER` is set to in `backend/.env` (`ollama` or `groq`), with a per-call override available. Currently only the resume-structuring call in `resumeProcessing.ts` is hardcoded to `groq` (fast, and it's the one step users wait on synchronously); everything else — field analysis, ATS scoring, MCQ/coding-question generation, fix suggestions, course plans — uses the default (`ollama`), which is free but slow on CPU-only machines.

## Plans & billing

**One registration per college.** `colleges.nameKey` (the name with case, spaces, punctuation and accents stripped) and `colleges.domainKey` (the bare website domain, if given) are unique in the database, so "Sardar Patel Institute of Technology" and "sardar patel institute-of-technology" can't both be registered, by sign-up or by renaming in the profile. Registration answers 409 `COLLEGE_EXISTS`. Only deleting the existing college frees the name. Rules: `backend/src/lib/collegeKeys.ts`.

**One free trial per college, not per plan.** It starts the moment the college registers and lasts exactly **7 days** (server time). The subscription row is created at registration with `activatedAt` = registration time and `trialEndsAt` = +7 days, and a database trigger (`lock_trial_dates`, migration `trial_dates_locked`) rejects any later change to either, so the trial can't be paused, extended or restarted. Switching plans during the trial never touches those dates.

When the trial ends unpaid there is **no grace period**: access stops at once, checked on every request in `requireAuth` (`backend/src/lib/orgAccess.ts`), so open sessions lock too.
- The college admin (TPO) can still sign in, but every page sends them to `/college/subscribe` and the API allows only billing endpoints until they pay.
- Faculty and students of that college (a student belongs to the college of the faculty member they linked to) can't sign in and see "Your organisation's plan has ended". Users with no college are unaffected.
- Paying restores access for everyone immediately.

Reminder emails go to the TPO daily for the last 3 days (3, 2 and 1 days left) and once when the trial ends, from a job that runs every 15 minutes (`backend/src/services/trialReminders.ts`). Each send is recorded on the subscription so it's never sent twice. It needs `SMTP_*` set.

Paid plans are bought **monthly** (the plan's monthly rate, 1-month term) **or yearly** (12x, 12-month term), chosen per payment (`billingCycle` on the order and the `payments` row). After a paid term ends there are 3 days (`BILLING.graceDays`) to renew. Payments are one-off Razorpay orders, not auto-debit, so monthly plans are renewed by paying again each month. The lengths live in `BILLING` in `backend/src/data/plans.ts`.

**Payments use Razorpay.** Set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` in `backend/.env` (test keys `rzp_test_...` while developing). The flow:

1. `POST /api/colleges/subscription/order` creates a Razorpay order priced from `PLANS` on the server (renew the current plan, or pass `planKey` to switch/upgrade; `billingCycle` is `monthly` or `yearly`) and records it in `payments`.
2. The subscribe page opens Razorpay Checkout.
3. `POST /api/colleges/subscription/verify` checks Razorpay's signature, then starts or extends the 1-year term (`applyPaidOrder` in `backend/src/services/billing.ts`).
4. `POST /api/webhooks/razorpay` does the same from Razorpay's side (events `payment.captured`, `payment.failed`, `order.paid`; set `RAZORPAY_WEBHOOK_SECRET`), so a closed tab after paying still activates the plan. Applying a payment twice is a no-op.

Renewing the same plan early extends from the current term's end. Switching plans during a paid term requires paying for the new plan, which starts a fresh term (no proration). Faculty seats are capped per plan (Starter 2, Growth 3, Campus 4) when adding faculty and when switching plans.

## Campus drives

The placement cell (TPO / college admin) adds the companies visiting campus at `/drives`, pasting each job description. The backend reads the required skills out of it with the LLM (`extractSkillsFromDescription` in `backend/src/services/campusDrives.ts`) and the TPO can edit that list before or after saving. If they don't have a description handy, "Draft with AI" (`POST /api/drives/suggest`) writes one from the company and role and offers a suggested tech stack to add with a tap; nothing is saved until the TPO saves the drive. Skills are matched against each student's latest parsed resume by the ML service's `POST /match-skills` (`ml-service/app/routers/match.py`), which reuses the ATS keyword matcher — so RESTful ↔ REST APIs and synonyms work, and a tool implies its category (PostgreSQL → SQL, GitHub → version control) but not the other way round.

- **Students** see every company for their college with their own fit %, matched/missing skills, a per-gap "find free courses" search, and on request LLM tips (per-gap advice + resume edits for that role). Tips are generated once and cached with the fit.
- **Faculty** see the same drives, with a readiness table for *their own* students (best fit first) and a "Campus drive fit" card on each student's page whose missing-skill chips feed the course finder.
- **TPO** sees college-wide totals only (fit buckets, average, most-missed skills) — individual results stay with each student's faculty member.

Fits are cached in `drive_fits` per (drive, resume): editing a drive recomputes them, and a newly uploaded resume gets a fresh row. An expired college plan pauses this like everything else (TPO can still read, not write). There are no eligibility rules (CGPA, branch, backlogs) yet.

## Core5 Campus (faculty certification)

`core5Campus/` runs against **this same database**, in its own `core5` schema. Faculty and TPOs sign in there with their Elevate email and password. Each certificate is stamped with the teacher's college when it's issued: the teacher sees their own on the faculty dashboard, the college's TPO sees their college's on the college dashboard (`GET /api/colleges/certifications`), and no college can see another's. Start it after Elevate's migrations have run; see `core5Campus/README.md`.

## Not included in this repo

- `backend/prisma/sqlite-archive/` — the old SQLite migrations and `dev.db` from before the move to PostgreSQL; kept for reference only, nothing reads them.
- `storage/resumes/*` — uploaded resume files (user data).
- `storage/avatars/*` — uploaded profile photos (user data). Anyone signed in can change their name and photo at `/profile`; faculty and college admins can also change their password, and admins their college details.
- `backend/.env` — contains your Groq API key; copy from `.env.example`.
- Ollama itself and its pulled models — install separately per machine.
