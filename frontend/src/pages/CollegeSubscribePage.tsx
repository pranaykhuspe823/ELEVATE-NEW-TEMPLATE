import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  formatRupees,
  phaseDotClass,
  phaseLabel,
  planLabel,
  pluralDays,
  termLabel,
  type Billing,
  type SubscriptionInfo,
} from "../components/college/types";
import { errorMessage, formatDate } from "../components/faculty/types";
import { CheckIcon } from "../components/faculty/icons";
import { Badge } from "../components/faculty/ui";

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

export default function CollegeSubscribePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [billing, setBilling] = useState<Billing | null>(null);
  const [interestedPlanKey, setInterestedPlanKey] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // plan key, or "pay"
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function choosePlan(planKey: string) {
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

  async function pay() {
    setBusy("pay");
    setError(null);
    setNotice(null);
    try {
      const { data } = await api.post<{ subscription: SubscriptionInfo }>(
        "/api/colleges/subscription/pay"
      );
      const until = data.subscription.termEndsAt
        ? formatDate(data.subscription.termEndsAt)
        : "";
      setNotice(`Paid plan activated${until ? ` — covered until ${until}` : ""}.`);
      loadMe();
    } catch (err) {
      setError(errorMessage(err, "Couldn't activate the paid plan."));
    } finally {
      setBusy(null);
    }
  }

  const term = billing ? termLabel(billing.termMonths) : "1-year";
  const currentPlan = plans?.find((p) => p.key === subscription?.planKey);

  return (
    <div className="pt-6 pb-4">
      <p className="eyebrow">Subscription</p>
      <h1 className="text-[30px] leading-tight mb-1.5">
        {subscription ? "Your plan" : "Choose your plan"}
      </h1>
      <p className="text-text-2 text-sm mb-5 max-w-[620px]">
        Every plan is a {term} term. Faculty seats are capped by your plan, and
        you can switch plans any time as your placement cell grows.
      </p>

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
              body: "Start on any plan with no payment. Everything is unlocked.",
            },
            {
              title: `Pay within ${pluralDays(billing.graceDays)}`,
              body: `When the trial ends you have ${pluralDays(
                billing.graceDays
              )} more to activate the paid plan.`,
            },
            {
              title: `${term} term`,
              body: "Paid plans run for a full year. Renew before it ends to keep going.",
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
                  <DetailRow label="Free trial ends" value={formatDate(subscription.trialEndsAt)} />
                )}
                {subscription.paidAt && subscription.termEndsAt && (
                  <DetailRow
                    label={`Paid ${term} term ends`}
                    value={formatDate(subscription.termEndsAt)}
                  />
                )}
                {subscription.needsPayment && subscription.graceEndsAt && (
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
              {subscription.yearlyPricePaise !== null && (
                <p>
                  <span className="font-display font-semibold text-[26px]">
                    {formatRupees(subscription.yearlyPricePaise)}
                  </span>
                  <span className="text-text-2 text-sm"> / {term === "1-year" ? "year" : term}</span>
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
                  ? "Activating…"
                  : subscription.phase === "active"
                  ? "Renew early"
                  : subscription.paidAt
                  ? "Renew plan"
                  : "Activate paid plan"}
              </button>
              <p className="text-text-2 text-xs leading-relaxed">
                Dev mode · payments aren't connected yet, so this activates the
                plan without charging.
              </p>
            </div>
          </div>
        </section>
      )}

      {!plans ? (
        <p className="text-text-2 text-sm">Loading…</p>
      ) : (
        <>
          <h2 className="text-[18px] mb-3">
            {subscription ? "Switch plan" : "Pick a plan to start your free trial"}
          </h2>
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
                    Billed yearly · {formatRupees(plan.priceInPaiseYearly)} / year
                  </p>
                  <p className="text-text-2 text-[13px] leading-snug mt-3">{plan.description}</p>
                  <ul className="mt-3 mb-5 flex flex-col gap-1.5 text-[13px]">
                    {[
                      `${plan.facultySeats} faculty seats`,
                      `${term} term`,
                      ...(!subscription && billing
                        ? [`${billing.trialDays}-day free trial, no payment`]
                        : []),
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
                    {busy === plan.key
                      ? "Working…"
                      : current
                      ? "Current plan"
                      : subscription
                      ? plan.facultySeats > (currentPlan?.facultySeats ?? 0)
                        ? `Upgrade to ${plan.name}`
                        : `Switch to ${plan.name}`
                      : billing
                      ? `Start ${billing.trialDays}-day free trial`
                      : "Start free trial"}
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
