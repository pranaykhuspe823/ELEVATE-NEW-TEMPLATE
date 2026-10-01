import { useEffect, useState, type ReactNode } from "react";
import axios from "axios";
import { api } from "../lib/api";
import { inputClass } from "../components/faculty/types";
import {
  BookIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LinkIcon,
  MailIcon,
  TargetIcon,
  UsersIcon,
} from "../components/faculty/icons";

interface Plan {
  key: string;
  name: string;
  facultySeats: number;
  priceInPaiseMonthly: number;
  priceInPaiseYearly: number;
  description?: string;
}

interface Billing {
  trialDays: number;
  graceDays: number;
  termMonths: number;
}

interface RegisterResponse {
  college: { id: string; name: string; domain: string | null };
  message: string;
  devActivationLink?: string;
}

const MIN_PASSWORD_LENGTH = 8;

const BENEFITS: { icon: ReactNode; text: string }[] = [
  {
    icon: <TargetIcon width={17} height={17} />,
    text: "One dashboard for every student's ATS score, field match, and weak topics",
  },
  {
    icon: <BookIcon width={17} height={17} />,
    text: "Assign courses straight to students who need them, not generic advice",
  },
  {
    icon: <UsersIcon width={17} height={17} />,
    text: "Faculty seats capped to your plan, provisioned by email in seconds",
  },
  {
    icon: <LinkIcon width={17} height={17} />,
    text: "Students self-link with a code — no roster upload, no IT ticket",
  },
];

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function Field({
  label,
  htmlFor,
  optional,
  children,
  hint,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  children: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-text">
        {label}
        {optional && (
          <span className="text-text-2 font-normal"> · optional</span>
        )}
      </label>
      {children}
      {hint}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-lime-ink pt-1">
      {children}
    </p>
  );
}

/** Stand-alone college signup, reachable right from the landing page -- no
 * prior sign-in needed. Collects college + admin details, then shows an
 * activation-link panel (no real email provider is wired in yet -- see
 * backend/src/lib/mailer.ts -- so the link is shown here directly instead
 * of only arriving by email). */
export default function CollegeRegisterPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [collegeName, setCollegeName] = useState("");
  const [domain, setDomain] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [interestedPlanKey, setInterestedPlanKey] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);

  const [billing, setBilling] = useState<Billing | null>(null);

  useEffect(() => {
    api
      .get<{ plans: Plan[]; billing: Billing }>("/api/colleges/plans")
      .then(({ data }) => {
        setPlans(data.plans);
        setBilling(data.billing);
      })
      .catch(() => {});
  }, []);

  const trialText = billing ? `${billing.trialDays}-day free trial` : "free trial";
  const termText =
    billing && billing.termMonths % 12 === 0
      ? `${billing.termMonths / 12}-year`
      : billing
      ? `${billing.termMonths}-month`
      : "1-year";
  const steps = [
    { title: "Register", body: "Create your placement-cell account. It's free." },
    { title: "Start your trial", body: `Confirm your email, then begin a ${trialText}.` },
    { title: "Add faculty", body: "Students link themselves with a code." },
  ];

  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit =
    !isSubmitting && collegeName.trim() !== "" && email.trim() !== "" && passwordLongEnough;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<RegisterResponse>("/api/colleges/register", {
        collegeName: collegeName.trim(),
        domain: domain.trim() || undefined,
        adminName: adminName.trim() || undefined,
        adminPhone: adminPhone.trim() || undefined,
        email: email.trim(),
        password,
        interestedPlanKey: interestedPlanKey || undefined,
        notes: notes.trim() || undefined,
      });
      setResult(data);
    } catch (err) {
      setError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't register your college."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="pt-10 pb-10 max-w-[600px] mx-auto">
        <div className="card !p-7 sm:!p-9 shadow-lg">
          <span className="w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center mb-5">
            <MailIcon width={24} height={24} />
          </span>
          <p className="eyebrow">Almost there</p>
          <h1 className="text-[28px] leading-tight mb-3">Activate your account</h1>
          <p className="text-text-2 text-sm leading-relaxed">
            {result.message} We've registered{" "}
            <strong className="text-text">{result.college.name}</strong> — click the
            link to confirm your email and start your {trialText}.
          </p>

          <ol className="mt-6 flex flex-col gap-3">
            <li className="flex items-center gap-3 text-sm">
              <span className="w-6 h-6 rounded-full bg-teal text-white flex items-center justify-center flex-none">
                <CheckIcon width={13} height={13} strokeWidth={3} />
              </span>
              College registered
            </li>
            <li className="flex items-center gap-3 text-sm font-medium">
              <span className="w-6 h-6 rounded-full border-2 border-lime text-lime text-xs flex items-center justify-center flex-none">
                2
              </span>
              Confirm your email
            </li>
            <li className="flex items-center gap-3 text-sm text-text-2">
              <span className="w-6 h-6 rounded-full border-2 border-border text-xs flex items-center justify-center flex-none">
                3
              </span>
              Choose a plan and add faculty
            </li>
          </ol>

          {result.devActivationLink && (
            <div className="mt-7 rounded-2xl border border-lime-ink/30 bg-lime-ink/10 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-lime-ink mb-1.5">
                Dev mode · no email provider connected yet
              </p>
              <p className="text-text-2 text-xs leading-relaxed mb-3">
                In production this link would be emailed to you. For now, here it is
                directly:
              </p>
              <a
                href={result.devActivationLink}
                className="btn btn-primary btn-small inline-block no-underline"
              >
                Activate now
              </a>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 xl:gap-12 items-start">
        <aside className="relative overflow-hidden rounded-[22px] border-2 border-border panel-gradient p-7 sm:p-9 shadow-lg lg:sticky lg:top-[100px]">
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
              Training &amp; placement
            </p>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.15] text-text mt-2 mb-4">
              Bring Elevate to your placement cell.
            </h1>
            <p className="text-text-2 text-sm leading-relaxed max-w-[460px]">
              Register your college, activate a plan, and start adding faculty
              seats — every student's ATS score, weak topics, and assigned
              courses in one place for your whole cell.
            </p>

            <ul className="flex flex-col gap-4 mt-7">
              {BENEFITS.map((b) => (
                <li key={b.text} className="flex items-start gap-3.5">
                  <span className="flex-none w-9 h-9 rounded-xl bg-white border-2 border-border text-lime flex items-center justify-center">
                    {b.icon}
                  </span>
                  <span className="text-sm text-text leading-snug pt-1.5">
                    {b.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-8 pt-6 border-t border-border">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-3 mb-4">
                How it works
              </p>
              <ol className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {steps.map((s, i) => (
                  <li key={s.title} className="flex xl:flex-col gap-3 xl:gap-2">
                    <span className="flex-none w-7 h-7 rounded-full bg-[#FFC93C] text-lime-dim text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-text">{s.title}</p>
                      <p className="text-[13px] text-text-2 leading-snug mt-0.5">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </aside>

        <div className="card !p-6 sm:!p-8">
          <h2 className="text-[22px] leading-tight mb-1">Register your college</h2>
          <p className="text-text-2 text-sm mb-6">
            Free to set up. You'll activate via email, then start a {trialText} —
            no payment needed to begin.
          </p>

          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
          >
            <SectionLabel>About you</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your name" htmlFor="reg-name" optional>
                <input
                  id="reg-name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  autoComplete="name"
                  className={inputClass}
                />
              </Field>
              <Field label="Contact number" htmlFor="reg-phone" optional>
                <input
                  id="reg-phone"
                  type="tel"
                  inputMode="tel"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  placeholder="e.g. 98765 43210"
                  autoComplete="tel"
                  className={inputClass}
                />
              </Field>
            </div>

            <SectionLabel>Your college</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="College name" htmlFor="reg-college">
                <input
                  id="reg-college"
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. ABC Institute of Technology"
                  autoComplete="organization"
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Website domain" htmlFor="reg-domain" optional>
                <input
                  id="reg-domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="e.g. abc.edu.in"
                  autoComplete="off"
                  className={inputClass}
                />
              </Field>
            </div>

            <SectionLabel>Sign-in details</SectionLabel>
            <Field label="Work email" htmlFor="reg-email">
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu.in"
                autoComplete="email"
                className={inputClass}
                required
              />
            </Field>
            <Field
              label="Password"
              htmlFor="reg-password"
              hint={
                <p
                  className={`flex items-center gap-1.5 text-[13px] transition-colors ${
                    passwordLongEnough ? "text-teal font-medium" : "text-text-2"
                  }`}
                >
                  <CheckIcon width={12} height={12} />
                  At least {MIN_PASSWORD_LENGTH} characters
                </p>
              }
            >
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  className={`${inputClass} w-full !pr-11`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-2 hover:text-lime hover:bg-lime/10 transition"
                >
                  {showPassword ? (
                    <EyeOffIcon width={17} height={17} />
                  ) : (
                    <EyeIcon width={17} height={17} />
                  )}
                </button>
              </div>
            </Field>

            {plans.length > 0 && (
              <>
                <SectionLabel>Plan you're interested in</SectionLabel>
                <div>
                  <div
                    role="radiogroup"
                    aria-label="Plan"
                    className="grid gap-3 sm:grid-cols-3"
                  >
                    {plans.map((p) => {
                      const selected = interestedPlanKey === p.key;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          title={p.description}
                          onClick={() => setInterestedPlanKey(selected ? "" : p.key)}
                          className={`text-left rounded-2xl border p-4 transition ${
                            selected
                              ? "border-lime bg-lime/5 ring-2 ring-lime/15"
                              : "border-border bg-white hover:border-lime/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-semibold text-[15px]">
                              {p.name}
                            </span>
                            <span
                              className={`w-[18px] h-[18px] rounded-full flex items-center justify-center flex-none ${
                                selected
                                  ? "bg-lime text-white"
                                  : "border-2 border-border"
                              }`}
                            >
                              {selected && (
                                <CheckIcon width={11} height={11} strokeWidth={3} />
                              )}
                            </span>
                          </div>
                          <p className="mt-2">
                            <span className="font-display font-semibold text-[20px]">
                              {formatRupees(p.priceInPaiseMonthly)}
                            </span>
                            <span className="text-text-2 text-[13px]"> /month</span>
                          </p>
                          <p className="text-text-2 text-[13px] mt-0.5">
                            Billed yearly · {formatRupees(p.priceInPaiseYearly)}
                          </p>
                          <p className="text-text-2 text-[13px] mt-1">
                            {p.facultySeats} faculty seats
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-text-2 text-[13px] mt-2.5">
                    Just a preference. Every plan is a {termText} term and starts
                    with a {trialText}
                    {billing
                      ? `; after it you have ${billing.graceDays} days to pay`
                      : ""}
                    . You'll confirm your plan after activating.
                  </p>
                </div>
              </>
            )}

            <Field label="Anything you'd like us to know?" htmlFor="reg-notes" optional>
              <textarea
                id="reg-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us briefly what you're looking for"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary !py-3.5 text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={!canSubmit}
            >
              {isSubmitting ? "Registering…" : "Register my college"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
