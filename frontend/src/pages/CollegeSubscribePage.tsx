import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { openCheckout } from "../lib/razorpay";
import { useAuth } from "../lib/auth";
import {
  formatRupees,
  phaseDotClass,
  phaseLabel,
  planLabel,
  termLabel,
  type Billing,
  type BillingCycle,
  type SubscriptionInfo,
} from "../components/college/types";
import { errorMessage, formatDate } from "../components/faculty/types";
import { CheckIcon } from "../components/faculty/icons";
import { Badge, Segmented } from "../components/faculty/ui";

interface Plan {
  key: string;
  name: string;
  facultySeats: number;
  priceInPaiseMonthly: number;
  priceInPaiseYearly: number;
  description: string;
}

function Message({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="pt-8 max-w-[520px]">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="text-[28px] mb-3">{title}</h1>
      {children}
    </div>
  );
}

function DetailRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm py-1.5 border-b border-border last:border-0">
      <span className="text-text-2">{label}</span>
      <span className={strong ? "font-semibold text-coral" : "font-medium"}>{value}</span>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CollegeSubscribePage() {
  const { user, planBlock, setPlanBlock } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [interestedPlanKey, setInterestedPlanKey] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // plan key, "pay", or "pay:<plan key>"
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cycle, setCycle] = useState<BillingCycle>("yearly");
  const [cycleTouched, setCycleTouched] = useState(false);

  // Default the toggle to however they paid last time.
  useEffect(() => {
    if (!cycleTouched && subscription?.paidAt) setCycle(subscription.billingCycle);
  }, [subscription, cycleTouched]);

  const isAdmin = user?.role === "COLLEGE_ADMIN";

  useEffect(() => {
    api
      .get<{ plans: Plan[]; billing: Billing }>("/api/colleges/plans")
      .then(({ data }) => {
        setPlans(data.plans);
        setBilling(data.billing);
      })
      .catch(() => setError("Couldn't load plans."));
  }, []);

  const loadMe = useCallback(() => {
    api
      .get<{
        college: { interestedPlanKey: string | null };
        subscription: SubscriptionInfo | null;
      }>("/api/colleges/me")
      .then(({ data }) => {
        setInterestedPlanKey(data.college.interestedPlanKey);
        setSubscription(data.subscription);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isAdmin) loadMe();
  }, [isAdmin, loadMe]);

  if (user && !isAdmin) {
    return (
      <Message eyebrow="Subscription" title="Register your college first">
        <p className="text-text-2 text-sm">
          You'll pick a plan right after registering.
        </p>
      </Message>
    );
  }

  if (!user) {
    return (
      <Message eyebrow="Subscription" title="Log in first">
        <p className="text-text-2 text-sm mb-4">
          Sign in as your college's admin to pick a plan.
        </p>
        <Link to="/college" className="btn btn-primary w-fit no-underline">
          Log in
        </Link>
      </Message>
    );
  }

  // Only during the free trial is switching plans free. Once it has ended
  // (or in a paid term), picking a plan means paying for it.
  const mustPay = !!subscription && subscription.phase !== "trialing";

  async function choosePlan(planKey: string) {
    if (mustPay) {
      await pay(planKey);
      return;
    }
    setBusy(planKey);
    setError(null);
    setNotice(null);
    const firstTime = !subscription;
    try {
      await api.post("/api/colleges/subscribe", { planKey });
      if (firstTime) {
        navigate("/college");
        return;
      }
      setNotice(`Switched to the ${planLabel(planKey)} plan.`);
      loadMe();
    } catch (err) {
      setError(errorMessage(err, "Couldn't change your plan."));
    } finally {
      setBusy(null);
    }
  }

  /** Razorpay: the server creates the order (and sets the price), Checkout
   * takes the payment, and the server checks Razorpay's signature before
   * the plan activates. planKey: pay for a different plan than the current. */
  async function pay(planKey?: string) {
    setBusy(planKey ? `pay:${planKey}` : "pay");
    setError(null);
    setNotice(null);
    try {
      const { data: order } = await api.post<{
        keyId: string;
        orderId: string;
        amountPaise: number;
        currency: string;
        plan: { key: string; name: string; facultySeats: number };
        prefill: { name: string; email: string; contact: string };
        collegeName: string;
      }>("/api/colleges/subscription/order", { ...(planKey ? { planKey } : {}), billingCycle: cycle });

      const result = await openCheckout({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Elevate",
        description: `${order.plan.name} plan · ${order.plan.facultySeats} faculty seats · ${
          cycle === "monthly" ? "1 month" : "1 year"
        }`,
        prefill: order.prefill,
        notes: { college: order.collegeName },
        theme: { color: "#3547FF" },
      });
      if (!result) return; // closed without paying

      const { data } = await api.post<{ subscription: SubscriptionInfo }>(
        "/api/colleges/subscription/verify",
        result
      );
      const until = data.subscription.termEndsAt
        ? formatDate(data.subscription.termEndsAt)
        : "";
      setNotice(
        `Payment received — ${planLabel(data.subscription.planKey)} plan active${
          until ? ` until ${until}` : ""
        }.`
      );
      setPlanBlock(null); // access restored for the college
      loadMe();
    } catch (err) {
      setError(errorMessage(err, "Payment didn't go through. You haven't been charged twice — try again."));
    } finally {
      setBusy(null);
    }
  }

  const term = billing ? termLabel(billing.termMonths) : "1-year";
  const perLabel = cycle === "monthly" ? "month" : "year";
  const priceOf = (p: { priceInPaiseMonthly: number; priceInPaiseYearly: number }) =>
    cycle === "monthly" ? p.priceInPaiseMonthly : p.priceInPaiseYearly;
  const cycleToggle = (
    <Segmented<BillingCycle>
      label="Billing cycle"
      size="sm"
      value={cycle}
      onChange={(v) => {
        setCycle(v);
        setCycleTouched(true);
      }}
      options={[
        { value: "monthly", label: "Monthly" },
        { value: "yearly", label: "Yearly" },
      ]}
    />
  );
  const currentPlan = plans?.find((p) => p.key === subscription?.planKey);

  return (
    <div className="pt-6 pb-4">
      <p className="eyebrow">Subscription</p>
      <h1 className="text-[30px] leading-tight mb-1.5">
        {subscription ? "Your plan" : "Choose your plan"}
      </h1>
      <p className="text-text-2 text-sm mb-5 max-w-[620px]">
        Your college gets one {billing?.trialDays ?? 7}-day free trial, which started
        when you registered. Pay monthly or yearly — faculty seats are capped by
        your plan.
      </p>

      {planBlock?.code === "PLAN_REQUIRED" && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
        >
          <strong>{planBlock.error}</strong> Your faculty and students can't sign in
          until you do.
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-4 py-2.5 text-sm text-teal"
        >
          <CheckIcon width={16} height={16} className="flex-none" />
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
        >
          {error}
        </div>
      )}

      {billing && (
        <ol className="grid gap-3 sm:grid-cols-3 mb-5">
          {[
            {
              title: `${billing.trialDays}-day free trial`,
              body: "Starts the moment your college registers. Everything is unlocked.",
            },
            {
              title: "Locks when it ends",
              body: `We email you daily in the last 3 days. At the end, access stops for everyone until you buy a plan.`,
            },
            {
              title: "Monthly or yearly",
              body: "Pay for a month or a year at a time. Renew before it ends to keep going.",
            },
          ].map((step, i) => (
            <li
              key={step.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-white px-4 py-3.5"
            >
              <span className="flex-none w-7 h-7 rounded-full bg-lime-ink/25 text-lime-ink text-xs font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-text-2 text-[13px] leading-snug mt-0.5">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {subscription && (
        <section className="card !p-0 overflow-hidden mb-5">
          <div className="grid md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2.5 mb-3">
                <h2 className="text-[20px]">{planLabel(subscription.planKey)} plan</h2>
                <span className="inline-flex items-center gap-2 rounded-full bg-lime text-white px-3 py-1 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full ${phaseDotClass(subscription.phase)}`} />
                  {phaseLabel(subscription)}
                </span>
                <Badge>{subscription.facultySeats} faculty seats</Badge>
              </div>
              <div>
                {subscription.activatedAt && (
                  <DetailRow label="Started" value={formatDate(subscription.activatedAt)} />
                )}
                {!subscription.paidAt && subscription.trialEndsAt && (
                  <DetailRow
                    label={subscription.phase === "trialing" ? "Free trial ends" : "Free trial ended"}
                    value={formatDateTime(subscription.trialEndsAt)}
                    strong={subscription.phase !== "trialing"}
                  />
                )}
                {subscription.paidAt && subscription.termEndsAt && (
                  <DetailRow
                    label={`Paid ${term} term ends`}
                    value={formatDate(subscription.termEndsAt)}
                  />
                )}
                {subscription.paidAt && subscription.needsPayment && subscription.graceEndsAt && (
                  <DetailRow
                    label={
                      subscription.phase === "expired"
                        ? "Locked since"
                        : subscription.phase === "grace"
                        ? "Locks on"
                        : "Locks if unpaid on"
                    }
                    value={formatDate(subscription.graceEndsAt)}
                    strong={subscription.phase !== "trialing"}
                  />
                )}
              </div>
            </div>

            <div className="bg-bg/70 border-t md:border-t-0 md:border-l border-border p-5 sm:p-6 flex flex-col justify-center gap-3">
              {cycleToggle}
              {subscription.yearlyPricePaise !== null && subscription.monthlyPricePaise !== null && (
                <p>
                  <span className="font-display font-semibold text-[26px]">
                    {formatRupees(
                      cycle === "monthly" ? subscription.monthlyPricePaise : subscription.yearlyPricePaise
                    )}
                  </span>
                  <span className="text-text-2 text-sm"> / {perLabel}</span>
                </p>
              )}
              <button
                type="button"
                className={`btn !py-3 disabled:opacity-60 ${
                  subscription.phase === "active" ? "" : "btn-primary"
                }`}
                disabled={busy !== null}
                onClick={() => void pay()}
              >
                {busy === "pay"
                  ? "Opening payment…"
                  : subscription.phase === "active"
                  ? `Renew early · 1 ${perLabel}`
                  : subscription.paidAt
                  ? `Renew for 1 ${perLabel}`
                  : `Pay for 1 ${perLabel}`}
              </button>
              <p className="text-text-2 text-xs leading-relaxed">
                Secure payment by Razorpay — UPI, cards, net banking and
                wallets. The plan activates as soon as payment is confirmed.
              </p>
            </div>
          </div>
        </section>
      )}

      {!plans ? (
        <p className="text-text-2 text-sm">Loading…</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-[18px]">
              {mustPay ? "Buy a plan" : subscription ? "Switch plan" : "Pick a plan"}
            </h2>
            {cycleToggle}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const current = plan.key === subscription?.planKey;
              const picked = !subscription && plan.key === interestedPlanKey;
              return (
                <div
                  key={plan.key}
                  className={`card flex flex-col !p-5 ${
                    current || picked ? "!border-lime ring-2 ring-lime/15" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-display font-semibold text-[17px]">{plan.name}</p>
                    {current && <Badge tone="navy">Current plan</Badge>}
                    {picked && <Badge tone="gold">Your pick</Badge>}
                  </div>
                  <p>
                    <span className="font-display font-semibold text-[28px]">
                      {formatRupees(plan.priceInPaiseMonthly)}
                    </span>
                    <span className="text-text-2 text-sm"> /month</span>
                  </p>
                  <p className="text-text-2 text-[13px] mt-0.5">
                    {cycle === "monthly"
                      ? "Billed monthly"
                      : `Billed yearly · ${formatRupees(plan.priceInPaiseYearly)} / year`}
                  </p>
                  <p className="text-text-2 text-[13px] leading-snug mt-3">{plan.description}</p>
                  <ul className="mt-3 mb-5 flex flex-col gap-1.5 text-[13px]">
                    {[
                      `${plan.facultySeats} faculty seats`,
                      cycle === "monthly" ? "1-month term" : `${term} term`,
                    ].map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckIcon width={13} height={13} className="text-teal flex-none" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className={`btn mt-auto disabled:opacity-60 disabled:cursor-not-allowed ${
                      current ? "" : "btn-primary"
                    }`}
                    disabled={busy !== null || current}
                    onClick={() => void choosePlan(plan.key)}
                  >
                    {busy === plan.key || busy === `pay:${plan.key}`
                      ? "Working…"
                      : current
                      ? "Current plan"
                      : mustPay
                      ? `Buy ${plan.name} · ${formatRupees(priceOf(plan))}/${cycle === "monthly" ? "mo" : "yr"}`
                      : subscription
                      ? plan.facultySeats > (currentPlan?.facultySeats ?? 0)
                        ? `Upgrade to ${plan.name}`
                        : `Switch to ${plan.name}`
                      : `Choose ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
