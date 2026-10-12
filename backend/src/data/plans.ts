export interface Plan {
  key: string;
  name: string;
  facultySeats: number;
  /** Per-month rate. Plans are billed for the full year up front. */
  priceInPaiseMonthly: number;
  /** What the college pays for one term: 12 x the monthly rate. */
  priceInPaiseYearly: number;
  description: string;
}

/** One free trial per college, not per plan: it starts the moment the
 * college registers and lasts exactly trialDays, then everything locks until
 * a plan is bought. Paid plans are 1-year terms; after a paid term ends there
 * are graceDays to renew. Reminder emails go out daily for the last
 * trialReminderDays of the trial. */
export const BILLING = {
  trialDays: 7,
  graceDays: 3,
  termMonths: 12,
  trialReminderDays: 3,
} as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Exact trial end for a college registered at `start`. */
export function trialEnd(start: Date): Date {
  return new Date(start.getTime() + BILLING.trialDays * DAY_MS);
}

function plan(
  key: string,
  name: string,
  facultySeats: number,
  priceInPaiseMonthly: number,
  description: string
): Plan {
  return {
    key,
    name,
    facultySeats,
    priceInPaiseMonthly,
    priceInPaiseYearly: priceInPaiseMonthly * BILLING.termMonths,
    description,
  };
}

// Static config -- tiers rarely change, don't need a DB table.
export const PLANS: Plan[] = [
  plan("starter", "Starter", 2, 499900, "For a single department getting started with Elevate."),
  plan("growth", "Growth", 3, 799900, "For a placement cell coordinating across a few departments."),
  plan("campus", "Campus", 4, 1199900, "For a full campus rollout with multiple faculty coordinators."),
];

/** How long one payment covers. Monthly is the plan's monthly rate for one
 * month; yearly is 12x that for twelve months. */
export type BillingCycle = "monthly" | "yearly";
export const TERM_MONTHS: Record<BillingCycle, number> = { monthly: 1, yearly: BILLING.termMonths };

export function isBillingCycle(v: unknown): v is BillingCycle {
  return v === "monthly" || v === "yearly";
}

export function priceFor(plan: Plan, cycle: BillingCycle): number {
  return cycle === "monthly" ? plan.priceInPaiseMonthly : plan.priceInPaiseYearly;
}

export function getPlan(key: string): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}
