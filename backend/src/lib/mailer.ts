import nodemailer from "nodemailer";

// No real email provider is wired in for activation emails yet. This logs
// the email content and hands the link straight back to the caller so the
// frontend can display it directly (dev-mode convenience) instead of it
// actually arriving by email.
//
// TODO: replace the body of sendActivationEmail with a real provider call
// once that flow also needs to actually land in an inbox. Everything that
// calls this function already treats it as fire-and-forget, so swapping the
// internals is the only change needed.
export async function sendActivationEmail(to: string, activationLink: string): Promise<void> {
  console.log(
    `[mailer:mock] Activation email to ${to} -- link: ${activationLink}`
  );
}

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
