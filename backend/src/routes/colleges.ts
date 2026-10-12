import { Router } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCollegeAdmin } from "../middleware/auth";
import { BILLING, PLANS, getPlan, isBillingCycle, priceFor, trialEnd } from "../data/plans";
import { computeState, serializeSubscription } from "../services/subscription";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS, signSession } from "../lib/session";
import { emailConfigured, sendActivationEmail } from "../lib/mailer";
import { certificatesForCollege } from "../lib/core5";
import { collegeDomainKey, collegeNameKey } from "../lib/collegeKeys";
import {
  createOrder,
  razorpayConfigured,
  razorpayKeyId,
  verifyCheckoutSignature,
} from "../lib/razorpay";
import { applyPaidOrder } from "../services/billing";

export const collegesRouter = Router();

const ACTIVATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function generateFacultyCode(): string {
  return `FAC-${crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6)}`;
}

/** Only on a local dev machine with no email set up: hand the activation link
 * back so you can click it. Never otherwise -- it would let anyone activate
 * an account for an email address they don't own. */
function devLink(link: string): { devActivationLink?: string } {
  return !emailConfigured() && process.env.NODE_ENV !== "production"
    ? { devActivationLink: link }
    : {};
}

export function alreadyRegistered(name: string): string {
  return `${name} is already registered on Elevate. If you're from this college, ask your placement cell's admin to add you, or contact support@core5.co.in.`;
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

  // One registration per college, whoever registers it. Only deleting the
  // existing college frees the name/domain (the unique index enforces this
  // even if two registrations race).
  const nameKey = collegeNameKey(collegeName);
  const domainKey = collegeDomainKey(domain);
  if (!nameKey) {
    res.status(400).json({ error: "Enter your college's full name." });
    return;
  }
  const duplicate = await prisma.college.findFirst({
    where: { OR: [{ nameKey }, ...(domainKey ? [{ domainKey }] : [])] },
    select: { name: true },
  });
  if (duplicate) {
    res.status(409).json({ error: alreadyRegistered(duplicate.name), code: "COLLEGE_EXISTS" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ACTIVATION_TTL_MS);

  let college;
  try {
    college = await prisma.$transaction(async (tx) => {
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
          nameKey,
          domainKey,
          adminPhone: adminPhone?.trim() || null,
          interestedPlanKey: interestedPlanKey || null,
          signupNotes: notes?.trim() || null,
          adminId: admin.id,
        },
      });
      await tx.user.update({ where: { id: admin.id }, data: { collegeId: created.id } });

      // The one free trial starts now, at registration, and ends exactly
      // BILLING.trialDays later. Both dates are server time and locked in the
      // database (see the trial_dates_locked migration).
      const plan = getPlan(interestedPlanKey || "") ?? PLANS[0];
      await tx.subscription.create({
        data: {
          collegeId: created.id,
          planKey: plan.key,
          status: "trialing",
          facultySeats: plan.facultySeats,
          activatedAt: created.createdAt,
          trialEndsAt: trialEnd(created.createdAt),
        },
      });
      return created;
    });
  } catch (err: any) {
    // Lost a race with a simultaneous registration of the same college/email.
    if (err?.code === "P2002") {
      if (String(err.meta?.target ?? "").includes("email")) {
        res.status(409).json({ error: "An account with that email already exists." });
      } else {
        res.status(409).json({ error: alreadyRegistered(collegeName.trim()), code: "COLLEGE_EXISTS" });
      }
      return;
    }
    throw err;
  }

  const link = activationLinkFor(token);
  const sent = await sendActivationEmail(normalizedEmail, link);

  res.status(201).json({
    college: { id: college.id, name: college.name, domain: college.domain },
    emailSent: sent,
    message: sent
      ? "Check your email for an activation link."
      : "We couldn't send the activation email. Use \"Resend activation link\" in a minute.",
    ...devLink(link),
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

  res.json({ message: "If that account needs activation, a new link has been sent.", ...devLink(link) });
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

/** Choose which plan the college is on. During the free trial this switches
 * freely (seat limits permitting); in a paid term it needs payment (see
 * /subscription/order). It never touches the trial dates -- the trial runs
 * from registration no matter what plan is picked or when. */
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
    const phase = computeState(existing).phase;
    if (phase === "active" && plan.key !== existing.planKey) {
      res.status(409).json({
        error: `You're in a paid term. Pay for ${plan.name} to switch -- it starts a fresh term from today.`,
        code: "PAYMENT_REQUIRED",
      });
      return;
    }
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

  // Only for a college registered before trials started at registration:
  // its trial still counts from when the college registered, not from now.
  const college = await prisma.college.findUnique({ where: { id: admin.collegeId } });
  const start = college?.createdAt ?? new Date();
  const created = await prisma.subscription.create({
    data: {
      collegeId: admin.collegeId,
      planKey: plan.key,
      status: "trialing",
      facultySeats: plan.facultySeats,
      activatedAt: start,
      trialEndsAt: trialEnd(start),
    },
  });
  res.status(201).json({ subscription: serializeSubscription(created) });
});

/** Step 1 of paying: create a Razorpay order for one term of a plan -- one
 * month or one year (billingCycle) -- for the current plan (renew) or another
 * (upgrade/switch). The amount comes from PLANS on the server; the browser
 * only gets the order id. */
collegesRouter.post("/subscription/order", async (req, res) => {
  if (!razorpayConfigured()) {
    res.status(503).json({ error: "Online payments aren't set up yet. Contact Core5 to activate your plan." });
    return;
  }
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

  const { planKey, billingCycle } = req.body as { planKey?: string; billingCycle?: string };
  const plan = getPlan(planKey || subscription.planKey);
  if (!plan) {
    res.status(400).json({ error: "Unknown plan." });
    return;
  }
  const cycle = billingCycle ?? subscription.billingCycle;
  if (!isBillingCycle(cycle)) {
    res.status(400).json({ error: "Choose monthly or yearly billing." });
    return;
  }
  const amountPaise = priceFor(plan, cycle);
  const facultyCount = await prisma.user.count({
    where: { collegeId: admin.collegeId, role: "FACULTY" },
  });
  if (facultyCount > plan.facultySeats) {
    res.status(400).json({
      error: `${plan.name} has ${plan.facultySeats} faculty seats but you already have ${facultyCount} faculty. Remove some first.`,
    });
    return;
  }

  let order;
  try {
    order = await createOrder({
      amountPaise,
      receipt: `sub_${subscription.id.slice(0, 8)}_${Date.now()}`,
      notes: { collegeId: admin.collegeId, planKey: plan.key, billingCycle: cycle },
    });
  } catch (err) {
    console.error("[razorpay] create order", err);
    res.status(502).json({ error: "Couldn't start the payment. Try again in a moment." });
    return;
  }

  await prisma.payment.create({
    data: {
      collegeId: admin.collegeId,
      subscriptionId: subscription.id,
      planKey: plan.key,
      facultySeats: plan.facultySeats,
      billingCycle: cycle,
      amountPaise,
      razorpayOrderId: order.id,
    },
  });

  const college = await prisma.college.findUnique({ where: { id: admin.collegeId } });
  res.status(201).json({
    keyId: razorpayKeyId(),
    orderId: order.id,
    amountPaise: order.amount,
    currency: order.currency,
    plan: { key: plan.key, name: plan.name, facultySeats: plan.facultySeats },
    billingCycle: cycle,
    prefill: { name: admin.name ?? "", email: admin.email, contact: college?.adminPhone ?? "" },
    collegeName: college?.name ?? "",
  });
});

/** Step 2: Checkout hands back the payment id + signature. Only a valid
 * signature for an order belonging to this college activates anything. */
collegesRouter.post("/subscription/verify", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as Record<
    string,
    unknown
  >;
  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  ) {
    res.status(400).json({ error: "Missing payment details." });
    return;
  }

  const payment = await prisma.payment.findUnique({
    where: { razorpayOrderId: razorpay_order_id },
  });
  if (!payment || payment.collegeId !== admin.collegeId) {
    res.status(404).json({ error: "Payment not found." });
    return;
  }
  if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    res.status(400).json({ error: "Payment couldn't be verified. If money was deducted, it will be refunded by Razorpay or applied shortly." });
    return;
  }

  const updated = await applyPaidOrder(razorpay_order_id, razorpay_payment_id);
  if (!updated) {
    res.status(404).json({ error: "Payment not found." });
    return;
  }
  res.json({ subscription: serializeSubscription(updated) });
});

/** This college's payment history, newest first. */
collegesRouter.get("/payments", async (req, res) => {
  const admin = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }
  const payments = await prisma.payment.findMany({
    where: { collegeId: admin.collegeId, status: "paid" },
    orderBy: { paidAt: "desc" },
    select: { planKey: true, billingCycle: true, amountPaise: true, razorpayPaymentId: true, paidAt: true },
  });
  res.json({ payments });
});

/** Core5 Campus certificates earned by this college's teachers while they
 * were at this college. Scoped by the college stamped on each certificate,
 * so no other college's records can appear here. Readable even on an
 * expired plan -- it's the college's own record. */
collegesRouter.get("/certifications", async (req, res) => {
  const admin = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { collegeId: true },
  });
  if (!admin?.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }
  try {
    res.json({ certificates: await certificatesForCollege(admin.collegeId) });
  } catch (err) {
    console.error("[core5] college certifications", err);
    res.json({ certificates: [] });
  }
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
