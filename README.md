# Elevate — Resume Intelligence Platform

Monorepo: `frontend/` (React + Vite + Tailwind), `backend/` (Node + Express + Prisma/SQLite), `ml-service/` (Python + FastAPI).

## Prerequisites

- Node.js 18+
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
npx prisma migrate dev   # creates dev.db (SQLite)
cp .env.example .env     # fill in GROQ_API_KEY, and GCC_PATH/GPP_PATH if gcc/g++ aren't on PATH

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

Every college plan is a **1-year term** that starts with a **7-day free trial**. After the trial (or after a paid year runs out) there's a **3-day grace period** to pay; past that the plan is *expired*: the college can't add faculty and its faculty dashboards pause (`402`) until it pays. The lengths live in `BILLING` in `backend/src/data/plans.ts`; the phase logic (trialing → grace → active → expired) is in `backend/src/services/subscription.ts` and is computed from dates, so there's no cron job. Prices are the monthly rate, billed for 12 months up front.

**Payments aren't connected yet.** `POST /api/colleges/subscription/pay` marks the plan paid for a full term without charging anyone. Replace it with a Razorpay/Stripe checkout + webhook before going live.

## Campus drives

The placement cell (TPO / college admin) adds the companies visiting campus at `/drives`, pasting each job description. The backend reads the required skills out of it with the LLM (`extractSkillsFromDescription` in `backend/src/services/campusDrives.ts`) and the TPO can edit that list before or after saving. If they don't have a description handy, "Draft with AI" (`POST /api/drives/suggest`) writes one from the company and role and offers a suggested tech stack to add with a tap; nothing is saved until the TPO saves the drive. Skills are matched against each student's latest parsed resume by the ML service's `POST /match-skills` (`ml-service/app/routers/match.py`), which reuses the ATS keyword matcher — so RESTful ↔ REST APIs and synonyms work, and a tool implies its category (PostgreSQL → SQL, GitHub → version control) but not the other way round.

- **Students** see every company for their college with their own fit %, matched/missing skills, a per-gap "find free courses" search, and on request LLM tips (per-gap advice + resume edits for that role). Tips are generated once and cached with the fit.
- **Faculty** see the same drives, with a readiness table for *their own* students (best fit first) and a "Campus drive fit" card on each student's page whose missing-skill chips feed the course finder.
- **TPO** sees college-wide totals only (fit buckets, average, most-missed skills) — individual results stay with each student's faculty member.

Fits are cached in `drive_fits` per (drive, resume): editing a drive recomputes them, and a newly uploaded resume gets a fresh row. An expired college plan pauses this like everything else (TPO can still read, not write). There are no eligibility rules (CGPA, branch, backlogs) yet.

## Not included in this repo

- `backend/prisma/dev.db` — local SQLite DB, recreate with `npx prisma migrate dev`.
- `storage/resumes/*` — uploaded resume files (user data).
- `storage/avatars/*` — uploaded profile photos (user data). Anyone signed in can change their name and photo at `/profile`; faculty and college admins can also change their password, and admins their college details.
- `backend/.env` — contains your Groq API key; copy from `.env.example`.
- Ollama itself and its pulled models — install separately per machine.
