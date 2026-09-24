import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { verifyGoogleIdToken } from "../lib/googleAuth";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  signSession,
} from "../lib/session";
import { requireAuth } from "../middleware/auth";
import { serializeUser } from "../lib/serializeUser";

export const authRouter = Router();

function generateFacultyCode(): string {
  // Short, easy to read aloud/type -- e.g. "FAC-7K2Q9X"
  return `FAC-${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

authRouter.post("/google", async (req, res) => {
  const { credential } = req.body as { credential?: string };
  if (!credential) {
    res.status(400).json({ error: "credential is required." });
    return;
  }

  try {
    const identity = await verifyGoogleIdToken(credential);

    let user = await prisma.user.findUnique({
      where: { googleId: identity.sub },
    });
    if (!user) {
      user = await prisma.user.upsert({
        where: { email: identity.email },
        update: {
          googleId: identity.sub,
          name: identity.name,
          avatarUrl: identity.picture,
        },
        create: {
          email: identity.email,
          googleId: identity.sub,
          name: identity.name,
          avatarUrl: identity.picture,
        },
      });
    }

    const token = signSession(user.id);
    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    res.json({ user: serializeUser(user) });
  } catch (err) {
    res.status(401).json({ error: "Google sign-in failed." });
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS);
  res.json({ ok: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: serializeUser(user) });
});

// Faculty accounts are a fully separate credential system from student
// (Google) sign-in: email + password. There are two ways in:
//   1. Self-serve, gated by a shared invite code (FACULTY_INVITE_CODE) --
//      the simplest thing that keeps randoms from declaring themselves
//      faculty when there's no college involved.
//   2. A college admin pre-provisions a placeholder User row for a faculty
//      member's email (see POST /api/colleges/faculty) -- role FACULTY,
//      collegeId + facultyCode already set, but passwordHash null. That
//      person "completes" their account here by setting a password, with no
//      invite code needed since the college already vouched for them. This
//      is the crux of the college provisioning flow -- get the branch below
//      right.
authRouter.post("/faculty/register", async (req, res) => {
  const { name, email, password, code } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    code?: string;
  };

  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    if (existing.role !== "FACULTY" || existing.passwordHash) {
      // Either a real account of a different kind (student/admin), or a
      // faculty account that already completed setup -- either way, this
      // isn't a fresh registration.
      res.status(409).json({ error: "An account with that email already exists." });
      return;
    }

    // Placeholder row provisioned by a college admin -- complete setup.
    const passwordHash = await bcrypt.hash(password, 10);
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name: name?.trim() || existing.name },
    });
    const token = signSession(updated.id);
    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    res.json({ user: serializeUser(updated) });
    return;
  }

  // No existing row -- genuine self-serve registration, gated by the
  // global invite code.
  const inviteCode = process.env.FACULTY_INVITE_CODE;
  if (!inviteCode) {
    res.status(500).json({ error: "Faculty sign-up isn't configured." });
    return;
  }
  if (code !== inviteCode) {
    res.status(403).json({ error: "Invalid invite code." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Retry once on the (very unlikely) chance of a facultyCode collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          role: "FACULTY",
          passwordHash,
          facultyCode: generateFacultyCode(),
        },
      });
      const token = signSession(user.id);
      res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
      res.status(201).json({ user: serializeUser(user) });
      return;
    } catch (err: any) {
      if (err?.code !== "P2002") {
        res.status(500).json({ error: "Couldn't create faculty account." });
        return;
      }
    }
  }
  res.status(500).json({ error: "Couldn't create faculty account." });
});

authRouter.post("/faculty/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || user.role !== "FACULTY" || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const token = signSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  res.json({ user: serializeUser(user) });
});

// College admin (TPO) login -- account created at POST /api/colleges/register
// and must be activated via the emailed link before this will succeed.
authRouter.post("/college/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!user || user.role !== "COLLEGE_ADMIN" || !user.passwordHash) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  if (!user.emailVerifiedAt) {
    res.status(403).json({ error: "Please activate your account using the link we emailed you." });
    return;
  }

  const token = signSession(user.id);
  res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
  res.json({ user: serializeUser(user) });
});

// Student links themselves to a faculty member using the code that faculty
// member shares (shown on their faculty dashboard).
authRouter.post("/join-faculty", requireAuth, async (req, res) => {
  const { code } = req.body as { code?: string };
  if (!code || typeof code !== "string") {
    res.status(400).json({ error: "Faculty code is required." });
    return;
  }

  const current = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!current) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (current.role !== "STUDENT") {
    res.status(400).json({ error: "Only student accounts can join a faculty." });
    return;
  }

  const faculty = await prisma.user.findUnique({
    where: { facultyCode: code.trim().toUpperCase() },
  });
  if (!faculty || faculty.role !== "FACULTY") {
    res.status(404).json({ error: "No faculty found with that code." });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: current.id },
    data: { facultyId: faculty.id },
  });
  res.json({ user: serializeUser(updated) });
});
