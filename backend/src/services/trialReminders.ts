import { prisma } from "../lib/prisma";
import { BILLING, DAY_MS } from "../data/plans";
import { emailConfigured, sendTrialEndedEmail, sendTrialReminderEmail } from "../lib/mailer";

const CHECK_EVERY_MS = 15 * 60 * 1000;

function subscribeUrl() {
  return `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/college/subscribe`;
}

/** One pass: email every unpaid trial that's in its last
 * BILLING.trialReminderDays (once per day-left: 3, 2, 1), and every trial
 * that has just ended. Each send is claimed in the database first, so a
 * restart, overlapping run or second server never sends one twice; a failed
 * send is un-claimed and retried on the next pass. */
export async function runTrialReminders(now: Date = new Date()): Promise<void> {
  if (!emailConfigured()) return;

  const trials = await prisma.subscription.findMany({
    where: { paidAt: null, status: "trialing", trialEndsAt: { not: null } },
    include: { college: { include: { admin: { select: { email: true } } } } },
  });

  for (const sub of trials) {
    const endsAt = sub.trialEndsAt!;
    const to = sub.college.admin.email;
    const msLeft = endsAt.getTime() - now.getTime();

    if (msLeft > 0) {
      const daysLeft = Math.ceil(msLeft / DAY_MS);
      if (daysLeft > BILLING.trialReminderDays) continue;
      const claimed = await prisma.subscription.updateMany({
        where: {
          id: sub.id,
          OR: [{ trialReminderDaysLeft: null }, { trialReminderDaysLeft: { gt: daysLeft } }],
        },
        data: { trialReminderDaysLeft: daysLeft },
      });
      if (claimed.count === 0) continue;
      const sent = await sendTrialReminderEmail({
        to,
        collegeName: sub.college.name,
        daysLeft,
        trialEndsAt: endsAt,
        subscribeUrl: subscribeUrl(),
      });
      if (!sent) {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { trialReminderDaysLeft: sub.trialReminderDaysLeft },
        });
      } else {
        console.log(`[trial] reminder (${daysLeft}d left) sent to ${to}`);
      }
    } else if (!sub.trialEndedEmailAt) {
      const claimed = await prisma.subscription.updateMany({
        where: { id: sub.id, trialEndedEmailAt: null },
        data: { trialEndedEmailAt: now },
      });
      if (claimed.count === 0) continue;
      const sent = await sendTrialEndedEmail({ to, collegeName: sub.college.name, subscribeUrl: subscribeUrl() });
      if (!sent) {
        await prisma.subscription.update({ where: { id: sub.id }, data: { trialEndedEmailAt: null } });
      } else {
        console.log(`[trial] ended email sent to ${to}`);
      }
    }
  }
}

export function startTrialReminderJob(): void {
  if (!emailConfigured()) {
    console.warn("[trial] SMTP_* not set -- trial reminder emails are off.");
  }
  const tick = () => runTrialReminders().catch((err) => console.error("[trial] reminder run failed", err));
  tick();
  setInterval(tick, CHECK_EVERY_MS).unref();
}
