import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

/** True when SMTP_* is set, i.e. emails actually get delivered. */
export function emailConfigured(): boolean {
  return getTransporter() !== null;
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Emails a college admin their account activation link. Returns false when
 * it wasn't delivered (SMTP not configured, or the send failed) -- the
 * account still exists and "resend activation" can try again. */
export async function sendActivationEmail(to: string, activationLink: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[mailer:mock] Activation email to ${to} -- link: ${activationLink}`);
    return false;
  }
  const link = escapeHtml(activationLink);
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: "Activate your Elevate college account",
      text: [
        "Welcome to Elevate!",
        "",
        "Confirm your email to activate your college account:",
        activationLink,
        "",
        "This link expires in 24 hours. If you didn't sign up, ignore this email.",
      ].join("\n"),
      html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b2150">
  <h2 style="margin:0 0 12px">Welcome to Elevate</h2>
  <p>Confirm your email to activate your college account.</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#3547FF;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Activate my account</a></p>
  <p style="font-size:13px;color:#4A5282">This link expires in 24 hours. If you didn't sign up, you can ignore this email.</p>
</div>`,
    });
    return true;
  } catch (err) {
    console.error(`[mailer] activation email to ${to} failed`, err);
    return false;
  }
}

/** Notifies sales of a new "schedule a demo" lead from the landing page, by
 * actually emailing DEMO_NOTIFY_EMAIL if SMTP_* env vars are configured.
 * Falls back to a console log (like sendActivationEmail above) when they
 * aren't, so the app still runs without mail credentials in dev. */
export async function notifyDemoRequest(details: {
  fullName: string;
  phone: string;
  company: string;
  email: string;
  planKey?: string | null;
  message?: string | null;
}): Promise<void> {
  const summary = `New demo request from ${details.fullName} <${details.email}>, ${details.company}, phone ${details.phone}, plan ${details.planKey || "unspecified"}${details.message ? `, message: ${details.message}` : ""}`;

  const to = process.env.DEMO_NOTIFY_EMAIL;
  const transport = getTransporter();
  if (!to || !transport) {
    console.log(`[mailer:mock] ${summary}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    // Hitting "Reply" in the support inbox answers the college directly.
    replyTo: details.email,
    subject: `New demo request: ${details.company}`,
    text: [
      `Name: ${details.fullName}`,
      `Email: ${details.email}`,
      `Phone: ${details.phone}`,
      `College/Company: ${details.company}`,
      `Plan considering: ${details.planKey || "Not sure yet"}`,
      `Message: ${details.message || "(none)"}`,
    ].join("\n"),
  });
}

const formatIST = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

function trialEmailHtml(heading: string, body: string, buttonLabel: string, url: string) {
  const link = escapeHtml(url);
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1b2150">
  <h2 style="margin:0 0 12px">${escapeHtml(heading)}</h2>
  <p>${body}</p>
  <p style="margin:24px 0"><a href="${link}" style="background:#3547FF;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">${escapeHtml(buttonLabel)}</a></p>
  <p style="font-size:13px;color:#4A5282">Plans: Starter (2 faculty seats), Growth (3), Campus (4) — pay monthly or yearly.</p>
</div>`;
}

async function send(to: string, subject: string, text: string, html: string): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) return false;
  try {
    await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
    return true;
  } catch (err) {
    console.error(`[mailer] "${subject}" to ${to} failed`, err);
    return false;
  }
}

/** Daily reminder during the last days of the free trial. */
export function sendTrialReminderEmail(p: {
  to: string;
  collegeName: string;
  daysLeft: number;
  trialEndsAt: Date;
  subscribeUrl: string;
}): Promise<boolean> {
  const when = formatIST(p.trialEndsAt);
  const days = `${p.daysLeft} day${p.daysLeft === 1 ? "" : "s"}`;
  const subject = `Your Elevate free trial ends in ${days}`;
  const text = `Your free trial for ${p.collegeName} ends in ${days}, on ${when}. After that, Elevate is locked for your college -- you, your faculty and your students -- until you purchase a plan.\n\nChoose a plan: ${p.subscribeUrl}`;
  const html = trialEmailHtml(
    `Your free trial ends in ${days}`,
    `The Elevate free trial for <strong>${escapeHtml(p.collegeName)}</strong> ends on <strong>${escapeHtml(when)}</strong>. After that, Elevate is locked for your college — you, your faculty and your students — until you purchase a plan.`,
    "Choose a plan",
    p.subscribeUrl
  );
  return send(p.to, subject, text, html);
}

/** Sent once, when the trial has ended unpaid. */
export function sendTrialEndedEmail(p: {
  to: string;
  collegeName: string;
  subscribeUrl: string;
}): Promise<boolean> {
  const subject = "Your Elevate free trial has ended";
  const text = `The free trial for ${p.collegeName} has ended. Elevate is now locked for your college until you purchase a plan.\n\nPurchase a plan: ${p.subscribeUrl}`;
  const html = trialEmailHtml(
    "Your free trial has ended",
    `The Elevate free trial for <strong>${escapeHtml(p.collegeName)}</strong> has ended. Elevate is now locked for your college — faculty and students can't sign in — until you purchase a plan.`,
    "Purchase a plan",
    p.subscribeUrl
  );
  return send(p.to, subject, text, html);
}
