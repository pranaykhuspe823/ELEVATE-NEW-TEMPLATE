import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getPlan } from "../data/plans";
import { notifyDemoRequest } from "../lib/mailer";

export const demoRequestsRouter = Router();

/** Public "schedule a demo" lead capture from the landing page. Deliberately
 * has no auth and creates no account -- see the DemoRequest model comment. */
demoRequestsRouter.post("/", async (req, res) => {
  const { fullName, phone, company, email, planKey, message } = req.body as {
    fullName?: string;
    phone?: string;
    company?: string;
    email?: string;
    planKey?: string;
    message?: string;
  };

  if (!fullName || !fullName.trim()) {
    res.status(400).json({ error: "Full name is required." });
    return;
  }
  if (!phone || !phone.trim()) {
    res.status(400).json({ error: "A contact number is required." });
    return;
  }
  if (!company || !company.trim()) {
    res.status(400).json({ error: "Company or college name is required." });
    return;
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    res.status(400).json({ error: "A valid work email is required." });
    return;
  }
  if (planKey && !getPlan(planKey)) {
    res.status(400).json({ error: "Unknown plan." });
    return;
  }

  const demoRequest = await prisma.demoRequest.create({
    data: {
      fullName: fullName.trim(),
      phone: phone.trim(),
      company: company.trim(),
      email: email.trim().toLowerCase(),
      planKey: planKey || null,
      message: message?.trim() || null,
    },
  });

  // The lead is already saved, so a mail failure doesn't fail the request --
  // but log it so a broken SMTP setup doesn't go unnoticed.
  notifyDemoRequest(demoRequest).catch((err) =>
    console.error(`[mailer] demo request ${demoRequest.id} not emailed:`, err)
  );

  res.status(201).json({ ok: true });
});
