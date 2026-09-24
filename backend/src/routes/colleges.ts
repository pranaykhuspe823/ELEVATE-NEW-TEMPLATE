import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCollegeAdmin } from "../middleware/auth";
import { BILLING, PLANS, getPlan } from "../data/plans";
import { addMonths, computeState, serializeSubscription } from "../services/subscription";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, signSession } from "../lib/session";
import { sendActivationEmail } from "../lib/mailer";

export const collegesRouter = Router();

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function generateFacultyCode(): string {
  return `FAC-${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

function activationLinkFor(token: string): string {
  const origin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  return `${origin}/college/activate?token=${token}`;
}

/** Stand-alone college signup, reachable right from the landing page -- no
 * prior sign-in required. Creates the College and its (unverified)
 * COLLEGE_ADMIN account together, then emails an activation link; login is
 * refused until that link is clicked (see /activate and
 * POST /api/auth/college/login). */
collegesRouter.post("/register", async (req, res) => {
  const { collegeName, domain, adminName, adminPhone, email, password, interestedPlanKey, notes } =
    req.body as {
      collegeName?: string;
      domain?: string;
      adminName?: string;
      adminPhone?: string;
      email?: string;
      password?: string;
      interestedPlanKey?: string;
      notes?: string;
    };

  if (!collegeName || !collegeName.trim()) {
    res.status(400).json({ error: "College name is required." });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  if (interestedPlanKey && !getPlan(interestedPlanKey)) {
    res.status(400).json({ error: "Unknown plan." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    res.status(409).json({ error: "An account with that email already exists." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);

  const college = await prisma.$transaction(async (tx) => {
    const admin = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: adminName?.trim() || null,
        role: "COLLEGE_ADMIN",
        passwordHash,
        emailVerificationToken: token,
        emailVerificationExpiresAt: expiresAt,
      },
    });
    const created = await tx.college.create({
      data: {
        name: collegeName.trim(),
        domain: domain?.trim() || null,
        adminPhone: adminPhone?.trim() || null,
        interestedPlanKey: interestedPlanKey || null,
        signupNotes: notes?.trim() || null,
        adminId: admin.id,
      },
    });
    await tx.user.update({ where: { id: admin.id }, data: { collegeId: created.id } });
    return created;
  });

  const link = activationLinkFor(token);
  await sendActivationEmail(normalizedEmail, link);

  res.status(201).json({
    college: { id: college.id, name: college.name, domain: college.domain },
    message: "Check your email for an activation link.",
    // Dev-mode convenience since no real email provider is wired in -- see
    // backend/src/lib/mailer.ts. Remove once real sending is in place.
    devActivationLink: link,
  });
});

/** Click-through activation. Verifies the token, marks the account active,
 * and signs the caller straight in. */
collegesRouter.post("/activate", async (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token) {
    res.status(400).json({ error: "Activation token is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
  if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    res.status(400).json({ error: "That activation link is invalid or has expired." });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  const sessionToken = signSession(updated.id);
  res.cookie(SESSION_COOKIE_NAME, sessionToken, SESSION_COOKIE_OPTIONS);
  res.json({
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      facultyCode: updated.facultyCode,
      facultyId: updated.facultyId,
      collegeId: updated.collegeId,
    },
  });
});

/** Re-issue an activation link for an unverified college admin who lost the
 * original (e.g. closed the dev-mode link before clicking it). */
collegesRouter.post("/resend-activation", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "Email is required." });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || user.role !== "COLLEGE_ADMIN" || user.emailVerifiedAt) {
    // Same generic response whether the account doesn't exist or is already
    // verified -- don't leak which via this endpoint.
    res.json({ message: "If that account needs activation, a new link has been sent." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);
  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: token, emailVerificationExpiresAt: expiresAt },
  });

  const link = activationLinkFor(token);
  await sendActivationEmail(user.email, link);

  res.json({ message: "A new activation link has been sent.", devActivationLink: link });
});

/** Static plan list -- no DB table, tiers rarely change. `billing` carries the
 * trial/grace/term lengths so the UI never hardcodes them. */
collegesRouter.get("/plans", (_req, res) => {
  res.json({ plans: PLANS, billing: BILLING });
});

collegesRouter.use(requireAuth, requireCollegeAdmin);

collegesRouter.get("/me", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }

  const college = await prisma.college.findUnique({
    where: { id: admin.collegeId },
    include: { subscription: true },
  });
  if (!college) {
    res.status(404).json({ error: "College not found." });
    return;
  }

  const facultyCount = await prisma.user.count({
    where: { collegeId: college.id, role: "FACULTY" },
  });

  res.json({
    college: {
      id: college.id,
      name: college.name,
      domain: college.domain,
      interestedPlanKey: college.interestedPlanKey,
    },
    subscription: college.subscription
      ? serializeSubscription(college.subscription)
      : null,
    billing: BILLING,
    facultyCount,
  });
});

/** Choose a plan. The first time, this starts the free trial (BILLING.trialDays,
 * no payment). Afterwards it only switches the plan -- the trial/term dates
 * are never reset, so switching can't be used to get a second trial. */
collegesRouter.post("/subscribe", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }

  const { planKey } = req.body as { planKey?: string };
  const plan = planKey ? getPlan(planKey) : undefined;
  if (!plan) {
    res.status(400).json({ error: "Unknown plan." });
    return;
  }

  const existing = await prisma.subscription.findUnique({
    where: { collegeId: admin.collegeId },
  });

  if (existing) {
    const facultyCount = await prisma.user.count({
      where: { collegeId: admin.collegeId, role: "FACULTY" },
    });
    if (facultyCount > plan.facultySeats) {
      res.status(400).json({
        error: `${plan.name} has ${plan.facultySeats} faculty seats but you already have ${facultyCount} faculty. Remove some first.`,
      });
      return;
    }
    const updated = await prisma.subscription.update({
      where: { id: existing.id },
      data: { planKey: plan.key, facultySeats: plan.facultySeats },
    });
    res.json({ subscription: serializeSubscription(updated) });
    return;
  }

  const now = new Date();
  const created = await prisma.subscription.create({
    data: {
      collegeId: admin.collegeId,
      planKey: plan.key,
      status: "trialing",
      facultySeats: plan.facultySeats,
      activatedAt: now,
      trialEndsAt: new Date(now.getTime() + BILLING.trialDays * 24 * 60 * 60 * 1000),
    },
  });
  res.status(201).json({ subscription: serializeSubscription(created) });
});

/** Mock payment -- marks the plan paid for a full term immediately, no real
 * gateway wired in. TODO: replace with a Razorpay/Stripe checkout session +
 * webhook that does this update on payment confirmation instead of
 * synchronously here. Renewing while still in a paid term extends from the
 * current term's end, so paying early doesn't waste the time already paid. */
collegesRouter.post("/subscription/pay", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { collegeId: admin.collegeId },
  });
  if (!subscription) {
    res.status(400).json({ error: "Choose a plan first." });
    return;
  }

  const now = new Date();
  const state = computeState(subscription, now);
  const termStart =
    state.phase === "active" && subscription.termEndsAt ? subscription.termEndsAt : now;

  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: "active",
      paidAt: now,
      termEndsAt: addMonths(termStart, BILLING.termMonths),
    },
  });
  res.json({ subscription: serializeSubscription(updated) });
});

/** Faculty roster for this college: name, email, share code, whether
 * they've completed account setup (set a password), and how many students
 * have linked to them. */
collegesRouter.get("/faculty", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }

  const faculty = await prisma.user.findMany({
    where: { collegeId: admin.collegeId, role: "FACULTY" },
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    faculty.map(async (f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      facultyCode: f.facultyCode,
      setupComplete: !!f.passwordHash,
      studentCount: await prisma.user.count({ where: { facultyId: f.id } }),
    }))
  );

  res.json({ faculty: rows });
});

/** Provision a faculty seat by email. Gated by an active subscription and
 * remaining seats. Creates a placeholder User row (no password yet) if none
 * exists for that email, or re-affiliates a previously-removed placeholder;
 * blocks anything that looks like a real, already-used account under a
 * different identity. */
collegesRouter.post("/faculty", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }

  const subscription = await prisma.subscription.findUnique({
    where: { collegeId: admin.collegeId },
  });
  if (!subscription) {
    res.status(402).json({ error: "Start your free trial before adding faculty." });
    return;
  }
  if (!computeState(subscription).canAddFaculty) {
    res.status(402).json({
      error: "Your plan has expired. Activate the paid plan to add faculty.",
    });
    return;
  }

  const facultyCount = await prisma.user.count({
    where: { collegeId: admin.collegeId, role: "FACULTY" },
  });
  if (facultyCount >= subscription.facultySeats) {
    res.status(403).json({
      error: `Faculty seat limit reached (${subscription.facultySeats}). Upgrade your plan to add more.`,
    });
    return;
  }

  const { email, name } = req.body as { email?: string; name?: string };
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required." });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    if (existing.role === "FACULTY" && existing.collegeId === admin.collegeId) {
      res.status(409).json({ error: "That person is already on your faculty roster." });
      return;
    }
    if (existing.role === "FACULTY") {
      res.status(409).json({ error: "That email is already registered as faculty elsewhere." });
      return;
    }
    if (existing.role === "COLLEGE_ADMIN") {
      res.status(409).json({ error: "That email belongs to a college admin account." });
      return;
    }
    if (existing.googleId) {
      // A real, already-used STUDENT account -- don't hijack it silently.
      res.status(409).json({ error: "That email already belongs to an existing student account." });
      return;
    }

    // A STUDENT row with no Google identity yet is effectively unused
    // (either never signed in, or a placeholder left behind by a prior
    // faculty removal) -- safe to (re)provision as faculty.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const updated = await prisma.user.update({
          where: { id: existing.id },
          data: {
            role: "FACULTY",
            collegeId: admin.collegeId,
            facultyCode: generateFacultyCode(),
            name: name?.trim() || existing.name,
          },
        });
        res.status(201).json({
          id: updated.id,
          email: updated.email,
          name: updated.name,
          facultyCode: updated.facultyCode,
          setupComplete: !!updated.passwordHash,
        });
        return;
      } catch (err: any) {
        if (err?.code !== "P2002") {
          res.status(500).json({ error: "Couldn't add faculty." });
          return;
        }
      }
    }
    res.status(500).json({ error: "Couldn't add faculty." });
    return;
  }

  // Retry once on the (very unlikely) chance of a facultyCode collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || null,
          role: "FACULTY",
          collegeId: admin.collegeId,
          facultyCode: generateFacultyCode(),
        },
      });
      res.status(201).json({
        id: created.id,
        email: created.email,
        name: created.name,
        facultyCode: created.facultyCode,
        setupComplete: false,
      });
      return;
    } catch (err: any) {
      if (err?.code !== "P2002") {
        res.status(500).json({ error: "Couldn't add faculty." });
        return;
      }
    }
  }
  res.status(500).json({ error: "Couldn't add faculty." });
});

/** Revert a faculty member back to a plain student. Known limitation:
 * students already linked to them (User.facultyId) are left pointing at
 * this now-former-faculty row -- harmless, that account just loses
 * dashboard access to them. Not worth cleaning up automatically. */
collegesRouter.delete("/faculty/:id", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target || target.role !== "FACULTY" || target.collegeId !== admin.collegeId) {
    res.status(404).json({ error: "Faculty member not found." });
    return;
  }

  await prisma.user.update({
    where: { id: target.id },
    data: { role: "STUDENT", collegeId: null, facultyCode: null },
  });

  res.json({ ok: true });
});
