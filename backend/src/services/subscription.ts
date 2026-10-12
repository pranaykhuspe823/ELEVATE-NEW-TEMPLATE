import type { Subscription } from "@prisma/client";
import { BILLING, getPlan } from "../data/plans";

const DAY_MS = 24 * 60 * 60 * 1000;

/** trialing: free trial running. active: paid and within its term.
 * grace: a PAID term has ended and the college has a few days to renew.
 * expired: the trial ended unpaid (no grace -- locked the moment it ends),
 * or a paid term's grace ran out. Locked until they pay.
 * All computed from server-side dates; the browser's clock plays no part. */
export type Phase = "trialing" | "grace" | "active" | "expired" | "cancelled";

export interface SubscriptionState {
  phase: Phase;
  /** Whole days left in the current phase (0 if it ends today). */
  daysLeft: number;
  trialEndsAt: Date | null;
  paidAt: Date | null;
  termEndsAt: Date | null;
  /** Last moment before the plan locks if it isn't paid/renewed. */
  graceEndsAt: Date | null;
  canAddFaculty: boolean;
  needsPayment: boolean;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function daysUntil(target: Date, now: Date): number {
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / DAY_MS));
}

export function computeState(sub: Subscription, now: Date = new Date()): SubscriptionState {
  const paid = sub.paidAt !== null && sub.termEndsAt !== null;
  // Unpaid: the trial is the clock. Paid: the term is.
  const clockEnd = paid ? sub.termEndsAt : sub.trialEndsAt;
  const base = {
    trialEndsAt: sub.trialEndsAt,
    paidAt: sub.paidAt,
    termEndsAt: sub.termEndsAt,
  };

  if (sub.status === "cancelled") {
    return { ...base, phase: "cancelled", daysLeft: 0, graceEndsAt: null, canAddFaculty: false, needsPayment: true };
  }
  if (!clockEnd) {
    // No trial end and not paid (shouldn't happen -- registration always sets
    // one): treat as ended rather than as an endless trial.
    return paid
      ? { ...base, phase: "active", daysLeft: 0, graceEndsAt: null, canAddFaculty: true, needsPayment: false }
      : { ...base, phase: "expired", daysLeft: 0, graceEndsAt: null, canAddFaculty: false, needsPayment: true };
  }

  // The free trial has no grace period; only renewing a paid year does.
  const graceEndsAt = paid
    ? new Date(clockEnd.getTime() + BILLING.graceDays * DAY_MS)
    : clockEnd;

  if (now < clockEnd) {
    return {
      ...base,
      phase: paid ? "active" : "trialing",
      daysLeft: daysUntil(clockEnd, now),
      graceEndsAt,
      canAddFaculty: true,
      needsPayment: !paid,
    };
  }
  if (now < graceEndsAt) {
    return {
      ...base,
      phase: "grace",
      daysLeft: daysUntil(graceEndsAt, now),
      graceEndsAt,
      canAddFaculty: true,
      needsPayment: true,
    };
  }
  return { ...base, phase: "expired", daysLeft: 0, graceEndsAt, canAddFaculty: false, needsPayment: true };
}

/** The shape sent to the client: the stored row plus its computed state. */
export function serializeSubscription(sub: Subscription, now: Date = new Date()) {
  const state = computeState(sub, now);
  return {
    planKey: sub.planKey,
    status: sub.status,
    facultySeats: sub.facultySeats,
    activatedAt: sub.activatedAt,
    billingCycle: sub.billingCycle,
    monthlyPricePaise: getPlan(sub.planKey)?.priceInPaiseMonthly ?? null,
    yearlyPricePaise: getPlan(sub.planKey)?.priceInPaiseYearly ?? null,
    ...state,
  };
}
