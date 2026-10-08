import { useState, type ReactNode } from "react";
import axios from "axios";
import { api } from "../../lib/api";
import { useAuth, type AuthUser } from "../../lib/auth";
import { inputClass } from "../faculty/types";
import {
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  TargetIcon,
  UsersIcon,
} from "../faculty/icons";

const POINTS: { icon: ReactNode; text: string }[] = [
  {
    icon: <UsersIcon width={17} height={17} />,
    text: "See every faculty member and how many students they guide",
  },
  {
    icon: <TargetIcon width={17} height={17} />,
    text: "Add or remove faculty seats whenever your cell changes",
  },
  {
    icon: <ShieldIcon width={17} height={17} />,
    text: "Your plan, seats and roster in one place",
  },
];

/** Shown when nobody (or a non-admin account) is looking at /college. TPOs
 * have their own email/password credentials, set at /college/register and
 * confirmed via the emailed activation link. */
export default function CollegeLoginGate() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsActivation, setNeedsActivation] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setIsSubmitting(true);
    setError(null);
    setNeedsActivation(false);
    setResendMessage(null);
    try {
      const { data } = await api.post<{ user: AuthUser }>("/api/auth/college/login", {
        email: email.trim(),
        password,
      });
      setUser(data.user);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setNeedsActivation(true);
      }
      setError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't sign you in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    try {
      const { data } = await api.post<{ message: string }>("/api/colleges/resend-activation", {
        email: email.trim(),
      });
      setResendMessage(data.message);
    } catch {
      setResendMessage("Couldn't resend the activation link.");
    }
  }

  return (
    <div className="pt-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 xl:gap-12 items-start">
        <aside className="relative overflow-hidden rounded-[22px] border-2 border-border panel-gradient p-7 sm:p-9 shadow-lg lg:sticky lg:top-[100px]">
          <div className="relative">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-lime">
              College dashboard
            </p>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.15] text-text mt-2 mb-4">
              Welcome back to your placement cell.
            </h1>
            <p className="text-text-2 text-sm leading-relaxed max-w-[440px]">
              Sign in with the email and password you registered your college
              with.
            </p>
            <ul className="flex flex-col gap-4 mt-8">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-start gap-3.5">
                  <span className="flex-none w-9 h-9 rounded-xl bg-white border-2 border-border text-lime flex items-center justify-center">
                    {p.icon}
                  </span>
                  <span className="text-sm text-text leading-snug pt-1.5">
                    {p.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="card !p-6 sm:!p-8 w-full max-w-[520px] lg:justify-self-center">
          <h2 className="text-[22px] leading-tight mb-1">TPO login</h2>
          <p className="text-text-2 text-sm mb-6">
            Training &amp; placement officers sign in here.
          </p>

          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleLogin();
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tpo-email" className="text-[13px] font-semibold">
                Email
              </label>
              <input
                id="tpo-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu.in"
                autoComplete="email"
                className={inputClass}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tpo-password" className="text-[13px] font-semibold">
                Password
              </label>
              <div className="relative">
                <input
                  id="tpo-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
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
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
              >
                {error}
              </div>
            )}
            {needsActivation && (
              <div className="rounded-xl border border-amber/30 bg-amber/5 px-4 py-3 text-sm">
                <p className="text-text-2">
                  Your email isn't confirmed yet.
                </p>
                <button
                  type="button"
                  className="mt-1 text-lime font-medium hover:underline"
                  onClick={() => void handleResend()}
                >
                  Resend activation link
                </button>
                {resendMessage && (
                  <p className="text-text-2 text-[13px] mt-2">{resendMessage}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary !py-3.5 text-[15px] disabled:opacity-60 disabled:cursor-not-allowed"
              disabled={isSubmitting || !email.trim() || !password}
            >
              {isSubmitting ? "Signing in…" : "Log in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
