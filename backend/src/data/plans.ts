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

/** Every plan is a 1-year term that starts with a free trial. After the
 * trial (or after a year's term runs out) the college has a short grace
 * period to pay; past that, adding faculty and faculty dashboards lock. */
export const BILLING = {
  trialDays: 7,
  graceDays: 3,
  termMonths: 12,
} as const;

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

export function getPlan(key: string): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}
