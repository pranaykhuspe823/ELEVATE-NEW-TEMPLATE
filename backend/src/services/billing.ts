import type { Subscription } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { TERM_MONTHS, isBillingCycle } from "../data/plans";
import { addMonths, computeState } from "./subscription";

/** Marks a Razorpay order paid and starts/extends the college's term.
 * Called from both the Checkout callback and the webhook -- whichever comes
 * second finds the payment already applied and changes nothing.
 *
 * A payment covers one month or one year (payment.billingCycle). Renewing
 * the same plan while a paid term is still running extends from that term's
 * end, so paying early wastes nothing. Paying for a different plan (an
 * upgrade) switches to it with a fresh term starting now. */
export async function applyPaidOrder(
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<Subscription | null> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { razorpayOrderId } });
    if (!payment) return null;

    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: "created" },
      data: { status: "paid", razorpayPaymentId, paidAt: new Date() },
    });
    const subscription = await tx.subscription.findUnique({
      where: { id: payment.subscriptionId },
    });
    if (!subscription || claimed.count === 0) return subscription; // already applied

    const now = new Date();
    const state = computeState(subscription, now);
    const extending =
      state.phase === "active" &&
      subscription.planKey === payment.planKey &&
      subscription.termEndsAt !== null;
    const termStart = extending ? subscription.termEndsAt! : now;

    return tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: "active",
        planKey: payment.planKey,
        facultySeats: payment.facultySeats,
        paidAt: now,
        billingCycle: payment.billingCycle,
        termEndsAt: addMonths(
          termStart,
          TERM_MONTHS[isBillingCycle(payment.billingCycle) ? payment.billingCycle : "yearly"]
        ),
      },
    });
  });
}
