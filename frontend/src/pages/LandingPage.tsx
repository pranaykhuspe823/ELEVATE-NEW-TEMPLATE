import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import "./landing.css";
import { api } from "../lib/api";
import { useAuth, type AuthUser } from "../lib/auth";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Same crop as components/BrandLogo, without relying on Tailwind. */
function Logo({ height = 44 }: { height?: number }) {
  return (
    <span className="lp-logo" style={{ height, width: (height * 882) / 264 }}>
      <img src="/newlogo.png" alt="Core5 Elevate" draggable={false} />
    </span>
  );
}

function GoogleIcon() {
  return (
    <svg className="lp-gicon" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.4 0-9.9-3.3-11.4-8l-6.6 5.1C9.8 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.6-2.7 4.8-5 6.3l6.5 5.5C39.9 37.5 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="lp-chev" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hand-drawn style squiggle used under section headings. */
function Squiggle({ color }: { color: string }) {
  return (
    <svg className="lp-squiggle" viewBox="0 0 160 14" fill="none" aria-hidden="true">
      <path d="M2 9c12-8 22 6 34-1s22 6 34-1 22 6 34-1 22 6 34-1 12 3 18 1" stroke={color} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** Invisible real Google button over a styled one: Google's popup needs a
 * genuine click on its own iframe, it can't be triggered programmatically. */
function GoogleSignInTrigger({
  children,
  onSignedIn,
  onError,
}: {
  children: ReactNode;
  onSignedIn: () => void;
  onError?: () => void;
}) {
  const { setUser } = useAuth();

  async function handleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) return;
    try {
      const { data } = await api.post<{ user: AuthUser }>("/api/auth/google", {
        credential: credentialResponse.credential,
      });
      setUser(data.user);
      onSignedIn();
    } catch {
      onError?.();
    }
  }

  return (
    <div className="lp-gwrap">
      {children}
      <div className="lp-gover">
        <GoogleLogin onSuccess={handleSuccess} onError={onError} />
      </div>
    </div>
  );
}

/** "Analyze my resume": straight to /upload if signed in, Google first if not. */
function AnalyzeButton({ size = "md", onError }: { size?: "md" | "lg"; onError: (m: string | null) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cls = `lp-btn lp-btn-primary${size === "lg" ? " lp-btn-lg" : ""}`;

  if (user) {
    return (
      <button type="button" className={cls} onClick={() => navigate("/upload")}>
        Analyze my resume
      </button>
    );
  }
  return (
    <GoogleSignInTrigger
      onSignedIn={() => {
        onError(null);
        navigate("/upload");
      }}
      onError={() => onError("Google sign-in didn't complete. Try again, or check that pop-ups are allowed.")}
    >
      <button type="button" className={cls} tabIndex={-1} aria-hidden="true">
        <GoogleIcon />
        Analyze my resume
      </button>
    </GoogleSignInTrigger>
  );
}

function LoginMenu({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`lp-login${open ? " open" : ""}`}>
      <button type="button" className="lp-btn lp-btn-white" aria-expanded={open} onClick={onToggle}>
        Log in
        <Chevron />
      </button>
      <div className="lp-login-panel" role="menu">
        <p className="lp-login-label">Students</p>
        <GoogleSignInTrigger
          onSignedIn={() => {
            setError(null);
            onToggle();
            navigate("/upload");
          }}
          onError={() => setError("Google sign-in didn't complete. Try again.")}
        >
          <button type="button" className="lp-login-item" tabIndex={-1} aria-hidden="true">
            <GoogleIcon />
            Continue with Google
          </button>
        </GoogleSignInTrigger>
        {error && <p className="lp-error">{error}</p>}
        <p className="lp-login-label">Faculty</p>
        <button type="button" className="lp-login-item" onClick={() => navigate("/faculty")}>
          Faculty login
        </button>
        <p className="lp-login-label">Placement cell</p>
        <button type="button" className="lp-login-item" onClick={() => navigate("/college")}>
          TPO login
        </button>
        <button type="button" className="lp-login-item" onClick={() => navigate("/college/register")}>
          Register your college
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

type IconName = "upload" | "chart" | "pen" | "check" | "book" | "mic" | "clock" | "eye" | "users" | "flag" | "done";

const ICON_PATHS: Record<IconName, ReactNode> = {
  upload: (<><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>),
  chart: (<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>),
  pen: (<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></>),
  check: (<><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 12l3 3 5-6" /></>),
  book: (<><path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z" /><path d="M4 19V5" /><path d="M9 7h7" /></>),
  mic: (<><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  eye: (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></>),
  flag: (<><path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /></>),
  done: (<><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></>),
};

function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Demo request form                                                   */
/* ------------------------------------------------------------------ */

type DemoState = "idle" | "sending" | "sent" | "error";

function DemoForm() {
  const [state, setState] = useState<DemoState>("idle");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    college: "",
    email: "",
    plan: "Not sure yet",
    message: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setState("sending");
    try {
      await api.post("/api/demo-requests", {
        fullName: form.name,
        phone: form.phone,
        company: form.college,
        email: form.email,
        planKey: form.plan === "Not sure yet" ? undefined : form.plan.toLowerCase(),
        message: form.message || undefined,
      });
      setState("sent");
    } catch {
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="lp-form lp-form-done">
        <span className="lp-done-icon"><Icon name="done" size={44} /></span>
        <h3>Request received</h3>
        <p>We'll call or email {form.email || "you"} within one working day to fix a time for the walkthrough.</p>
      </div>
    );
  }

  return (
    <form className="lp-form" onSubmit={submit}>
      <div className="lp-form-grid">
        <label>
          Full name
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" autoComplete="name" />
        </label>
        <label>
          Contact no.
          <input required type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
        </label>
        <label>
          College
          <input required value={form.college} onChange={(e) => set("college", e.target.value)} placeholder="Your college name" autoComplete="organization" />
        </label>
        <label>
          Work email
          <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@college.edu" autoComplete="email" />
        </label>
        <label className="lp-span">
          Plan you're considering
          <select value={form.plan} onChange={(e) => set("plan", e.target.value)}>
            <option>Not sure yet</option>
            <option>Starter</option>
            <option>Growth</option>
            <option>Campus</option>
          </select>
        </label>
        <label className="lp-span">
          What are you looking for?
          <textarea rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Number of students, how you run placements today..." />
        </label>
      </div>
      {state === "error" && (
        <p className="lp-error">Couldn't send your request. Check your connection and try again.</p>
      )}
      <button type="submit" className="lp-btn lp-btn-primary lp-btn-lg lp-btn-full" disabled={state === "sending"}>
        {state === "sending" ? "Sending..." : "Book a free demo"}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const STEPS = [
  { icon: "upload" as IconName, color: "blue", title: "Upload your resume", body: "PDF or DOCX up to 10 MB, signed in with your Google account." },
  { icon: "chart" as IconName, color: "lav", title: "Get your field and score", body: "Scored out of 100 on formatting, keywords, structure and impact, with the exact keywords you're missing." },
  { icon: "pen" as IconName, color: "pink", title: "Fix the weak lines", body: "Vague bullets come back rewritten, side by side with your original. Download the marked-up PDF." },
  { icon: "check" as IconName, color: "butter", title: "Take a skill test", body: "Multiple-choice on your listed skills, plus coding problems for technical fields. Camera stays on." },
  { icon: "book" as IconName, color: "mint", title: "Follow your course plan", body: "Lowest-scoring topics first, with free courses from Microsoft Learn and YouTube for each one." },
  { icon: "mic" as IconName, color: "sky", title: "Practise the interview", body: "A spoken interview about your own projects, ending in a scored report you can download." },
];

const FIELDS = ["Software Engineering", "Data Science", "DevOps & SRE", "Product Management", "UX/UI Design", "Marketing"];

const PLANS = [
  { name: "Starter", seats: 2, monthly: 4999, note: "One department getting started", color: "blue" },
  { name: "Growth", seats: 3, monthly: 7999, note: "A placement cell across a few departments", color: "lav" },
  { name: "Campus", seats: 4, monthly: 11999, note: "A full campus rollout", color: "mint" },
];

const FAQ = [
  {
    q: "How is the ATS score worked out?",
    a: "Formatting, keywords and structure are checked with fixed rules against the keyword list for your field, so the same resume gets the same result. Impact is judged by reading your bullet points. The four add up to 100.",
  },
  {
    q: "Why does the test need my camera?",
    a: "So faculty can trust the scores. During the test Elevate checks camera frames for a phone or a second person and flags the attempt if it finds one.",
  },
  {
    q: "Who can see my results?",
    a: "You, and the faculty member your college links you to. The placement officer sees college-wide totals for drives, not your individual fit.",
  },
  {
    q: "How does copy checking work?",
    a: "Each new resume is compared with the other resumes on file at your college. Close matches go to faculty with the overlapping text shown. Nobody is rejected automatically.",
  },
  {
    q: "What happens after the 7-day trial?",
    a: "Colleges get a 3-day grace period to pay for the year. After that, adding faculty and the faculty dashboards pause until the plan is renewed.",
  },
];

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const navigate = useNavigate();
  const [loginOpen, setLoginOpen] = useState(false);
  const [ctaError, setCtaError] = useState<string | null>(null);
  const [role, setRole] = useState<"faculty" | "tpo">("faculty");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!(e.target as HTMLElement).closest(".lp-login")) setLoginOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLoginOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="landing-page">
      {/* NAV */}
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <a href="/" aria-label="Elevate home">
            <Logo height={42} />
          </a>
          <nav className="lp-nav-links" aria-label="Page sections">
            <a href="#how">How it works</a>
            <a href="#interview">Mock interview</a>
            <a href="#drives">Campus drives</a>
            <a href="#colleges">For colleges</a>
            <a href="#pricing">Pricing</a>
          </nav>
          <div className="lp-nav-cta">
            <a href="#demo" className="lp-btn lp-btn-ghost lp-hide-sm">Book a demo</a>
            <LoginMenu open={loginOpen} onToggle={() => setLoginOpen((o) => !o)} />
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="lp-hero">
          <span className="lp-blob b1" aria-hidden="true" />
          <span className="lp-blob b2" aria-hidden="true" />
          <span className="lp-blob b3" aria-hidden="true" />
          <div className="lp-wrap lp-hero-in lp-hero-center">
            <div className="lp-hero-copy">
              <p className="lp-hero-brand"><span className="lp-hl">ELEVATE</span></p>
              <h1>
                Know where your resume stands{" "}
                <span className="lp-hl">before placement season does.</span>
              </h1>
              <p className="lp-lede">
                A single platform for resume scoring, skill tests and mock interviews. Students get a
                clear path to improve. Colleges see who's ready for placement.
              </p>
              <div className="lp-hero-cta">
                <AnalyzeButton size="lg" onError={setCtaError} />
                <a className="lp-btn lp-btn-white lp-btn-lg" href="#how">
                  See how it works
                </a>
              </div>
              {ctaError && <p className="lp-error">{ctaError}</p>}
            </div>
          </div>
        </section>

        {/* MARQUEE */}
        <div className="lp-marquee" aria-label="Fields Elevate scores against">
          <div className="lp-marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="lp-marquee-set" aria-hidden={dup === 1}>
                {FIELDS.map((f) => (
                  <span key={f}>{f} <b>✦</b></span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS: bento */}
        <section className="lp-sec" id="how">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-center">
              <h2>From one upload to <span className="lp-hl">interview-ready.</span></h2>
              <Squiggle color="#7C5CFF" />
              <p className="lp-sec-p">
                Each step uses what came before it. Your test is built from your resume, and your
                course plan from your test.
              </p>
            </div>
            <ol className="lp-bento">
              {STEPS.map((s, i) => (
                <li key={s.title} className={`lp-step c-${s.color}`}>
                  <div className="lp-step-top">
                    <span className="lp-step-emoji"><Icon name={s.icon} size={26} /></span>
                    <span className="lp-step-n">Step {i + 1}</span>
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="lp-center lp-mt">
              <AnalyzeButton onError={setCtaError} />
            </div>
          </div>
        </section>

        {/* INTERVIEW */}
        <section className="lp-sec lp-bg-lav" id="interview">
          <div className="lp-wrap lp-iv">
            <div>
              <span className="lp-pill white">AI mock interview</span>
              <h2 className="lp-mt-sm">An interviewer who has <span className="lp-hl">actually read your resume.</span></h2>
              <p className="lp-sec-p">
                Turn on your camera and mic and answer out loud. Questions come from the projects and
                tools on your resume, and follow-ups depend on what you say.
              </p>
              <div className="lp-iv-stage">
                <div className="lp-row-between">
                  <span className="lp-pill white"><i className="lp-dot live" /> Listening</span>
                  <span className="lp-pill white">Question 5</span>
                </div>
                <div className="lp-wave" aria-hidden="true">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <i key={i} style={{ animationDelay: `${(i % 9) * 0.09}s` }} />
                  ))}
                </div>
                <p className="lp-iv-q">
                  You listed Redis in your internship. What were you caching, and how did you decide
                  when to expire it?
                </p>
              </div>
            </div>
            <div className="lp-illo-wrap">
              <img className="lp-illo" src="/interview.png" alt="AI mock interview in progress, with a live resume-based report" />
            </div>
          </div>
        </section>

        {/* CAMPUS DRIVES */}
        <section className="lp-sec" id="drives">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-center">
              <h2>Campus drives, <span className="lp-hl">matched to every resume.</span></h2>
              <Squiggle color="#2FBF85" />
              <p className="lp-sec-p">
                The placement cell pastes the job description. Elevate pulls out the required skills,
                and every student sees how well they fit and what to learn before the company arrives.
              </p>
            </div>
            <div className="lp-flow">
              <div className="lp-flow-card c-butter">
                <span className="lp-who">Placement officer</span>
                <h3>Adds the drive</h3>
                <p className="lp-jd">"We're hiring graduate engineers comfortable with Java, Spring Boot, SQL and Docker..."</p>
                <div className="lp-chips">
                  {["Java", "Spring Boot", "SQL", "Docker", "Git"].map((k) => (
                    <span key={k} className="lp-chip white">{k}</span>
                  ))}
                </div>
                <p className="lp-small">Skills are editable. No description yet? Draft one with AI.</p>
              </div>
              <span className="lp-flow-arrow" aria-hidden="true">→</span>
              <div className="lp-flow-card c-sky">
                <span className="lp-who">Student</span>
                <h3>Sees their fit</h3>
                <div className="lp-fitrow">
                  <span className="lp-fitnum">72%</span>
                  <div>
                    <p className="lp-strong">4 of 5 skills matched</p>
                    <span className="lp-chip miss">Missing: Spring Boot</span>
                  </div>
                </div>
                <p className="lp-small">Synonyms count. PostgreSQL covers SQL, GitHub covers version control. Tap any gap to find free courses, or ask for resume tips for this role.</p>
              </div>
              <span className="lp-flow-arrow" aria-hidden="true">→</span>
              <div className="lp-flow-card c-mint">
                <span className="lp-who">Faculty</span>
                <h3>Knows who's ready</h3>
                <ul className="lp-ready">
                  <li><span>Student A</span><b className="hi">92%</b></li>
                  <li><span>Student B</span><b className="mid">72%</b></li>
                  <li><span>Student C</span><b className="lo">41%</b></li>
                </ul>
                <p className="lp-small">Only their own students, best fit first.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FACULTY + TPO */}
        <section className="lp-sec lp-bg-sky" id="colleges">
          <div className="lp-wrap">
            <div className="lp-sec-head">
              <h2>For the people who <span className="lp-hl">get students placed.</span></h2>
              <Squiggle color="#3547FF" />
            </div>
            <div className="lp-roles" role="tablist" aria-label="Choose a role">
              <button type="button" role="tab" aria-selected={role === "faculty"} className={role === "faculty" ? "on" : ""} onClick={() => setRole("faculty")}>
                Faculty
              </button>
              <button type="button" role="tab" aria-selected={role === "tpo"} className={role === "tpo" ? "on" : ""} onClick={() => setRole("tpo")}>
                Placement officers
              </button>
            </div>

            {role === "faculty" ? (
              <div className="lp-role" role="tabpanel">
                <div>
                  <h3>Every student's gaps, without chasing resumes on email.</h3>
                  <ul className="lp-ticks">
                    <li><span className="lp-tick blue"><Check /></span>ATS score, test score and weak topics for each linked student</li>
                    <li><span className="lp-tick lav"><Check /></span>Assign courses the AI suggests, or add your own links</li>
                    <li><span className="lp-tick pink"><Check /></span>Review resumes that closely match another student's, with the overlapping text shown</li>
                    <li><span className="lp-tick mint"><Check /></span>Campus drive fit on every student's page</li>
                  </ul>
                  <button type="button" className="lp-btn lp-btn-primary" onClick={() => navigate("/faculty")}>
                    Faculty login
                  </button>
                </div>
                <div className="lp-panel">
                  <div className="lp-panel-head">
                    <b>Final year, Computer Engineering</b>
                    <span className="lp-pill lav">38 students</span>
                  </div>
                  <div className="lp-stats">
                    <div className="lp-stat c-mint"><b>24</b><span>On track (75%+ ATS)</span></div>
                    <div className="lp-stat c-lav"><b>9</b><span>Course assigned, in progress</span></div>
                    <div className="lp-stat c-pink"><b>5</b><span>Needs attention</span></div>
                  </div>
                  <div className="lp-flag">
                    <Icon name="flag" size={18} />
                    <span>2 resumes flagged this term for close overlap with another on file.</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="lp-role" role="tabpanel">
                <div>
                  <h3>Run placement season from one account.</h3>
                  <ul className="lp-ticks">
                    <li><span className="lp-tick blue"><Check /></span>Register your college and verify by email</li>
                    <li><span className="lp-tick lav"><Check /></span>Add faculty accounts up to your plan's seats</li>
                    <li><span className="lp-tick pink"><Check /></span>Add campus drives and see college-wide readiness</li>
                    <li><span className="lp-tick mint"><Check /></span>See the skills most students are missing for each company</li>
                  </ul>
                  <div className="lp-btn-row">
                    <button type="button" className="lp-btn lp-btn-primary" onClick={() => navigate("/college/register")}>
                      Register your college
                    </button>
                    <button type="button" className="lp-btn lp-btn-white" onClick={() => navigate("/college")}>
                      TPO login
                    </button>
                  </div>
                </div>
                <div className="lp-panel">
                  <div className="lp-panel-head">
                    <b>Associate Software Engineer drive</b>
                    <span className="lp-pill lav">214 students</span>
                  </div>
                  <div className="lp-bars lp-pad">
                    {[
                      { l: "Strong fit (75%+)", n: 58, w: 27, c: "mint" },
                      { l: "Close (50 to 74%)", n: 97, w: 45, c: "purple" },
                      { l: "Not yet (under 50%)", n: 59, w: 28, c: "pink" },
                    ].map((b) => (
                      <div key={b.l}>
                        <div className="lp-bar-row"><span>{b.l}</span><b>{b.n}</b></div>
                        <div className="lp-track"><div className={`lp-fill ${b.c}`} style={{ width: `${b.w}%` }} /></div>
                      </div>
                    ))}
                  </div>
                  <div className="lp-pad lp-pad-top0">
                    <p className="lp-muted">Most missed skills</p>
                    <div className="lp-chips">
                      <span className="lp-chip miss">Spring Boot, 61%</span>
                      <span className="lp-chip miss">Docker, 44%</span>
                      <span className="lp-chip miss">Microservices, 30%</span>
                    </div>
                  </div>
                  <p className="lp-flag">Placement officers see totals. Individual results stay with each student's faculty.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PRICING */}
        <section className="lp-sec" id="pricing">
          <div className="lp-wrap">
            <div className="lp-sec-head lp-center">
              <h2>College <span className="lp-hl">plans</span></h2>
              <Squiggle color="#FF7AB6" />
              <p className="lp-sec-p">
                Every plan runs for one year and starts with a 7-day free trial. Plans differ only in
                faculty seats. Students are always free.
              </p>
            </div>
            <div className="lp-plans">
              {PLANS.map((p) => (
                <div key={p.name} className={`lp-price c-${p.color}${p.name === "Growth" ? " featured" : ""}`}>
                  {p.name === "Growth" && <span className="lp-sticker s5" aria-hidden="true">the sweet spot</span>}
                  <h3>{p.name}</h3>
                  <p className="lp-small">{p.note}</p>
                  <p className="lp-amt">
                    {inr(p.monthly)}
                    <span>/month</span>
                  </p>
                  <p className="lp-small">{inr(p.monthly * 12)} billed yearly</p>
                  <p className="lp-seats">{p.seats} faculty seats</p>
                  <ul className="lp-ticks lp-ticks-sm">
                    <li><span className="lp-tick white"><Check /></span>Unlimited students</li>
                    <li><span className="lp-tick white"><Check /></span>Campus drives and fit reports</li>
                    <li><span className="lp-tick white"><Check /></span>Copy checking across your college</li>
                  </ul>
                  <button type="button" className={`lp-btn ${p.name === "Growth" ? "lp-btn-primary" : "lp-btn-white"} lp-btn-full`} onClick={() => navigate("/college/register")}>
                    Start free trial
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEMO */}
        <section className="lp-sec lp-demo-sec" id="demo">
          <div className="lp-wrap lp-demo">
            <div>
              <span className="lp-pill white">For placement teams</span>
              <h2 className="lp-mt-sm">See Elevate on <span className="lp-hl">your own campus.</span></h2>
              <p className="lp-sec-p">
                Tell us a bit about your college and we'll set up a walkthrough for your placement
                team. No card, no commitment.
              </p>
            </div>
            <DemoForm />
          </div>
        </section>

        {/* FAQ */}
        <section className="lp-sec">
          <div className="lp-wrap lp-faq">
            <div>
              <h2>Questions <span className="lp-hl">people ask</span></h2>
              <Squiggle color="#FFC93C" />
            </div>
            <div className="lp-faq-list">
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="lp-final-sec">
          <div className="lp-wrap">
            <div className="lp-final">
              <span className="lp-sticker s6" aria-hidden="true">takes about a minute</span>
              <span className="lp-sticker s7" aria-hidden="true">PDF or Word</span>
              <h2>Upload your resume and see your score.</h2>
              <p>You'll need a PDF or Word file and a Google account. That's it.</p>
              <div className="lp-final-cta">
                <AnalyzeButton size="lg" onError={setCtaError} />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="lp-foot">
        <div className="lp-wrap">
          <div className="lp-foot-grid">
            <div>
              <Logo height={40} />
              <p>Resume scoring, skill tests, mock interviews and campus drive matching for students and placement cells. Made by Core5 Systems and Services, Mumbai.</p>
            </div>
            <div>
              <h4>Students</h4>
              <a href="#how">How it works</a>
              <a href="/upload">Analyze my resume</a>
              <a href="/assignments">My assignments</a>
              <a href="/drives">Campus drives</a>
            </div>
            <div>
              <h4>Faculty</h4>
              <a href="/faculty">Faculty login</a>
              <a href="#colleges">What faculty get</a>
            </div>
            <div>
              <h4>Colleges</h4>
              <a href="/college/register">Register your college</a>
              <a href="/college">TPO login</a>
              <a href="#pricing">Pricing</a>
              <a href="#demo">Book a demo</a>
            </div>
          </div>
          <div className="lp-legal">
            <span>© {new Date().getFullYear()} Core5 Elevate. All rights reserved.</span>
            <span>Made in Mumbai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
