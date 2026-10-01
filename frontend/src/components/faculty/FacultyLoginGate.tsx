import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useAuth, type AuthUser } from "../../lib/auth";
import { errorMessage, inputClass } from "./types";
import {
  BookIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  LinkIcon,
  TargetIcon,
} from "./icons";
import { Segmented } from "./ui";

type Mode = "login" | "register";

const MIN_PASSWORD_LENGTH = 8;

const BENEFITS: { icon: ReactNode; text: string }[] = [
  {
    icon: <TargetIcon width={17} height={17} />,
    text: "One dashboard for every linked student's ATS score, field, and weak topics",
  },
  {
    icon: <BookIcon width={17} height={17} />,
    text: "Assign courses straight to students who need them, with real links to learn from",
  },
  {
    icon: <CheckIcon width={17} height={17} />,
    text: "Track who's completed what, without chasing anyone down",
  },
  {
    icon: <LinkIcon width={17} height={17} />,
    text: "Students link themselves with your share code — no roster to manage",
  },
];

function Field({
  label,
  htmlFor,
  optional,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-semibold text-text">
        {label}
        {optional && <span className="text-text-2 font-normal"> · optional</span>}
      </label>
      {children}
      {hint}
    </div>
  );
}

/** Shown when nobody (or a non-faculty account) is looking at /faculty.
 * Faculty have their own email/password credentials, entirely separate from
 * the Google sign-in students use. */
export default function FacultyLoginGate() {
  const { setUser } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registering = mode === "register";
  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;
  const canSubmit =
    !isSubmitting &&
    email.trim() !== "" &&
    password !== "" &&
    (!registering || passwordLongEnough);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = registering
        ? await api.post<{ user: AuthUser }>("/api/auth/faculty/register", {
            name: name.trim(),
            email: email.trim(),
            password,
            // Faculty added by their college don't need one; the server decides.
            code: inviteCode.trim() || undefined,
          })
        : await api.post<{ user: AuthUser }>("/api/auth/faculty/login", {
            email: email.trim(),
            password,
          });
      setUser(data.user);
    } catch (err) {
      setError(
        errorMessage(
          err,
          registering ? "Couldn't create your account." : "Couldn't sign you in."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="pt-8 pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 xl:gap-12 items-start">
        <aside className="relative overflow-hidden rounded-[22px] border-2 border-border panel-gradient p-7 sm:p-9 shadow-lg lg:sticky lg:top-[100px]">
          <div className="relative">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
              Faculty access
            </p>
            <h1 className="text-[30px] sm:text-[36px] leading-[1.15] text-text mt-2 mb-4">
              See exactly where your students are stuck.
            </h1>
            <p className="text-text-2 text-sm leading-relaxed max-w-[460px]">
              One dashboard for every student linked to you — their ATS score,
              detected field, and weak topics — so you can assign the right
              course to the right person.
            </p>
            <ul className="flex flex-col gap-4 mt-8">
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
          </div>
        </aside>

        <div className="w-full max-w-[520px] lg:justify-self-center">
          <div className="card !p-6 sm:!p-8">
            <Segmented<Mode>
              label="Log in or register"
              value={mode}
              onChange={switchMode}
              options={[
                { value: "login", label: "Log in" },
                { value: "register", label: "Register" },
              ]}
            />
            <h2 className="text-[22px] leading-tight mt-5 mb-1">
              {registering ? "Create your faculty account" : "Faculty login"}
            </h2>
            <p className="text-text-2 text-sm mb-6">
              {registering
                ? "Set up your account to start guiding your students."
                : "Sign in with your faculty email and password."}
            </p>

            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              {registering && (
                <Field label="Full name" htmlFor="fac-name" optional>
                  <input
                    id="fac-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Meera Sharma"
                    autoComplete="name"
                    className={inputClass}
                  />
                </Field>
              )}
              <Field label="Email" htmlFor="fac-email">
                <input
                  id="fac-email"
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
                htmlFor="fac-password"
                hint={
                  registering ? (
                    <p
                      className={`flex items-center gap-1.5 text-[13px] transition-colors ${
                        passwordLongEnough ? "text-teal font-medium" : "text-text-2"
                      }`}
                    >
                      <CheckIcon width={12} height={12} />
                      At least {MIN_PASSWORD_LENGTH} characters
                    </p>
                  ) : undefined
                }
              >
                <div className="relative">
                  <input
                    id="fac-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={registering ? "Create a password" : "Your password"}
                    autoComplete={registering ? "new-password" : "current-password"}
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
              {registering && (
                <Field
                  label="Invite code"
                  htmlFor="fac-code"
                  optional
                  hint={
                    <p className="text-text-2 text-[13px] leading-relaxed">
                      Only needed if your college didn't add you. Ask your Core5
                      admin for it.
                    </p>
                  }
                >
                  <input
                    id="fac-code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Invite code"
                    autoComplete="off"
                    className={`${inputClass} font-mono`}
                  />
                </Field>
              )}

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
                {isSubmitting
                  ? registering
                    ? "Creating account…"
                    : "Signing in…"
                  : registering
                  ? "Create account"
                  : "Log in"}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-2xl border border-lime-ink/30 bg-lime-ink/10 px-5 py-4">
            <p className="text-sm font-semibold">Added by your college's TPO?</p>
            <p className="text-text-2 text-[13px] leading-relaxed mt-1">
              Use the email they registered you with — no invite code needed,
              just set a password.
            </p>
            {!registering && (
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="mt-2 text-sm font-medium text-lime hover:underline"
              >
                Complete my account →
              </button>
            )}
          </div>

          <p className="text-text-2 text-sm text-center mt-4">
            Are you the TPO?{" "}
            <Link to="/college/register" className="text-lime font-medium hover:underline">
              Register your college
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
