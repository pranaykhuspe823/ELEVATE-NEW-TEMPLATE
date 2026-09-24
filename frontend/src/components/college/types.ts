import { formatDate } from "../faculty/types";

export interface CollegeInfo {
  id: string;
  name: string;
  domain: string | null;
}

/** trialing: free trial running. grace: trial (or a paid term) ended, a few
 * days left to pay. active: paid, within its term. expired: locked until paid. */
export type Phase = "trialing" | "grace" | "active" | "expired" | "cancelled";

export interface SubscriptionInfo {
  planKey: string;
  status: string;
  phase: Phase;
  facultySeats: number;
  activatedAt: string | null;
  trialEndsAt: string | null;
  paidAt: string | null;
  termEndsAt: string | null;
  graceEndsAt: string | null;
  daysLeft: number;
  canAddFaculty: boolean;
  needsPayment: boolean;
  yearlyPricePaise: number | null;
}

export interface Billing {
  trialDays: number;
  graceDays: number;
  termMonths: number;
}

export interface FacultyRow {
  id: string;
  name: string | null;
  email: string;
  facultyCode: string | null;
  setupComplete: boolean;
  studentCount: number;
}

export function planLabel(key: string) {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function pluralDays(n: number) {
  return `${n} day${n === 1 ? "" : "s"}`;
}

/** "1-year" for 12 months, otherwise "N-month". */
export function termLabel(months: number) {
  return months % 12 === 0 ? `${months / 12}-year` : `${months}-month`;
}

const DOT_COLOR: Record<Phase, string> = {
  trialing: "bg-[#E5B94E]",
  grace: "bg-[#FFB4A2]",
  active: "bg-[#8EE0BF]",
  expired: "bg-[#FF8A7A]",
  cancelled: "bg-white/50",
};

export function phaseDotClass(phase: Phase) {
  return DOT_COLOR[phase];
}

/** Short status for pills: what state the plan is in. */
export function phaseLabel(sub: SubscriptionInfo): string {
  switch (sub.phase) {
    case "trialing":
      return `Free trial · ${pluralDays(sub.daysLeft)} left`;
    case "grace":
      return `Payment due · ${pluralDays(sub.daysLeft)} left`;
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    default:
      return "Cancelled";
  }
}

/** The date that matters most right now, for the Plan tile's hint. */
export function phaseHint(sub: SubscriptionInfo): string {
  const date = (iso: string | null) => (iso ? formatDate(iso) : "");
  switch (sub.phase) {
    case "trialing":
      return `Trial ends ${date(sub.trialEndsAt)}`;
    case "grace":
      return `Pay by ${date(sub.graceEndsAt)}`;
    case "active":
      return `Renews ${date(sub.termEndsAt)}`;
    case "expired":
      return `Expired ${date(sub.graceEndsAt)}`;
    default:
      return "Cancelled";
  }
}
