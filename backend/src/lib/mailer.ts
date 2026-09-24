// No real email provider is wired in. This logs the email content and hands
// the link straight back to the caller so the frontend can display it
// directly (dev-mode convenience) instead of it actually arriving by email.
//
// TODO: replace the body of sendActivationEmail with a real provider call
// (nodemailer + SMTP, SendGrid, Resend, AWS SES, etc.) once credentials are
// available. Everything that calls this function already treats it as
// fire-and-forget, so swapping the internals is the only change needed.
export async function sendActivationEmail(to: string, activationLink: string): Promise<void> {
  console.log(
    `[mailer:mock] Activation email to ${to} -- link: ${activationLink}`
  );
}
