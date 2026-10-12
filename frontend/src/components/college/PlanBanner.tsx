import { Link } from "react-router-dom";
import { formatDate } from "../faculty/types";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
import { ClockIcon, ShieldIcon } from "../faculty/icons";
import {
  formatRupees,
  planLabel,
  pluralDays,
  termLabel,
  type Billing,
  type SubscriptionInfo,
} from "./types";

interface Copy {
  tone: "gold" | "coral" | "navy";
  title: string;
  body: string;
  cta: string;
}

const TONES = {
  gold: "border-lime-ink/40 bg-lime-ink/10",
  coral: "border-coral/35 bg-coral/5",
  navy: "border-lime/25 bg-lime/5",
} as const;

const ICON_TONES = {
  gold: "bg-lime-ink/20 text-lime-ink",
  coral: "bg-coral/15 text-coral",
  navy: "bg-lime/10 text-lime",
} as const;

function copyFor(sub: SubscriptionInfo, billing: Billing): Copy | null {
  const price =
    sub.monthlyPricePaise !== null && sub.yearlyPricePaise !== null
      ? `${formatRupees(sub.monthlyPricePaise)}/month or ${formatRupees(sub.yearlyPricePaise)}/year`
      : "the paid plan";
  const term = termLabel(billing.termMonths);
  const paidTerm = sub.billingCycle === "monthly" ? "monthly" : term;
  const plan = planLabel(sub.planKey);

  switch (sub.phase) {
    case "trialing":
      return {
        tone: "gold",
        title: `Free trial · ${pluralDays(sub.daysLeft)} left`,
        body: `Your free trial ends on ${
          sub.trialEndsAt ? formatDateTime(sub.trialEndsAt) : "soon"
        }. Buy the ${plan} plan (${price}) before then — when it ends, you, your faculty and your students lose access until you do.`,
        cta: "Buy a plan",
      };
    case "grace":
      return {
        tone: "coral",
        title: `Payment due · ${pluralDays(sub.daysLeft)} left`,
        body: sub.paidAt
          ? `Your ${paidTerm} term has ended. Renew within ${pluralDays(
              sub.daysLeft
            )} or adding faculty pauses and your faculty lose access.`
          : `Your free trial has ended. Buy a plan to restore access.`,
        cta: sub.paidAt ? "Renew plan" : "Activate paid plan",
      };
    case "expired":
      return {
        tone: "coral",
        title: sub.paidAt ? "Your plan has expired" : "Your free trial has ended",
        body: `Elevate is locked for your college — faculty and students can't sign in — until you ${
          sub.paidAt ? `renew your plan (${price})` : "buy a plan"
        }.`,
        cta: sub.paidAt ? "Renew plan" : "Buy a plan",
      };
    case "active":
      if (sub.daysLeft > 30) return null;
      return {
        tone: "navy",
        title: `Renews in ${pluralDays(sub.daysLeft)}`,
        body: `Your ${paidTerm} plan runs until ${
          sub.termEndsAt ? formatDate(sub.termEndsAt) : "soon"
        }. Renew early any time — the extra year is added to the end of your current term.`,
        cta: "Renew plan",
      };
    default:
      return null;
  }
}

/** Shown on the college dashboard whenever the plan needs attention: a
 * running trial, payment due, expired, or a term about to renew. */
export default function PlanBanner({
  subscription,
  billing,
}: {
  subscription: SubscriptionInfo;
  billing: Billing;
}) {
  const copy = copyFor(subscription, billing);
  if (!copy) return null;

  return (
    <section
      className={`mt-4 flex flex-col sm:flex-row sm:items-center gap-3.5 rounded-2xl border px-4 py-3.5 ${TONES[copy.tone]}`}
    >
      <span
        className={`flex-none w-10 h-10 rounded-xl flex items-center justify-center ${ICON_TONES[copy.tone]}`}
      >
        {copy.tone === "navy" ? (
          <ShieldIcon width={18} height={18} />
        ) : (
          <ClockIcon width={18} height={18} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] leading-snug">{copy.title}</h2>
        <p className="text-text-2 text-[13px] leading-relaxed mt-0.5">{copy.body}</p>
      </div>
      <Link
        to="/college/subscribe"
        className="btn btn-primary btn-small flex-none self-start sm:self-center no-underline whitespace-nowrap"
      >
        {copy.cta}
      </Link>
    </section>
  );
}
