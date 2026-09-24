import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import "./landing.css";
import { api } from "../lib/api";
import { useAuth, type AuthUser } from "../lib/auth";
import SiteFooter from "../components/SiteFooter";

function GoogleIcon() {
  return (
    <svg className="gicon" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.7 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.6 0-14.1 4.3-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.5-4.6 2.4-7.5 2.4-5.4 0-9.9-3.3-11.4-8l-6.6 5.1C9.8 39.6 16.4 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.9 2.6-2.7 4.8-5 6.3l6.5 5.5C39.9 37.5 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg className="chev" viewBox="0 0 12 12" fill="none">
      <path
        d="M2.5 4.5L6 8l3.5-3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Wraps a decorative button with an invisible real Google login button on
 * top of it, so the visible button keeps its custom styling while the click
 * actually drives Google's OAuth popup (which requires a genuine user
 * gesture on Google's own button/iframe -- it can't be triggered
 * programmatically from an unrelated element). */
function GoogleSignInTrigger({
  children,
  onSignedIn,
  onError,
}: {
  children: React.ReactNode;
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
    <div style={{ position: "relative", display: "inline-block" }}>
      {children}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          overflow: "hidden",
        }}
      >
        <GoogleLogin onSuccess={handleSuccess} onError={onError} />
      </div>
    </div>
  );
}

interface LoginDropdownProps {
  id: string;
  openWrap: string | null;
  onToggle: (id: string) => void;
  large?: boolean;
  centered?: boolean;
}

function LoginDropdown({ id, openWrap, onToggle, large, centered }: LoginDropdownProps) {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={`login-wrap${openWrap === id ? " open" : ""}`}>
      <button
        type="button"
        className={`login-btn${large ? " large" : ""}`}
        style={centered ? { margin: "0 auto" } : undefined}
        onClick={() => onToggle(id)}
      >
        Login
        <Chevron />
      </button>
      <div
        className="login-panel"
        style={
          centered
            ? { left: "50%", right: "auto", transform: "translate(-50%, -6px)", textAlign: "left" }
            : undefined
        }
      >
        <div className="panel-label">Student</div>
        <GoogleSignInTrigger
          onSignedIn={() => {
            setError(null);
            onToggle(id);
            navigate("/upload");
          }}
          onError={() => setError("Sign-in failed. Please try again.")}
        >
          <button type="button" className="gbtn" tabIndex={-1} aria-hidden="true">
            <GoogleIcon />
            Continue with Google
          </button>
        </GoogleSignInTrigger>
        {error && (
          <p style={{ color: "var(--coral-ink, #d54826)", fontSize: 12, marginTop: 8 }}>
            {error}
          </p>
        )}
        <div className="login-divider" />
        <div className="panel-label">Faculty</div>
        <button
          type="button"
          className="gbtn"
          onClick={() => {
            onToggle(id);
            navigate("/faculty");
          }}
        >
          Faculty login
        </button>
        <div className="login-divider" />
        <div className="panel-label">College / TPO</div>
        <button
          type="button"
          className="gbtn"
          onClick={() => {
            onToggle(id);
            navigate("/college/register");
          }}
        >
          Register your college
        </button>
        <p style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 8, lineHeight: 1.5 }}>
          Start with a 7-day free trial. Plans are for 1 year.
        </p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openWrap, setOpenWrap] = useState<string | null>(null);
  const [ctaError, setCtaError] = useState<string | null>(null);

  function toggleLogin(id: string) {
    setOpenWrap((prev) => (prev === id ? null : id));
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".login-wrap")) {
        setOpenWrap(null);
      }
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <>
    <div className="landing-page">
      <div className="glow glow-1" />
      <div className="glow glow-2" />

      <div className="topbar">
        <div className="nav">
          <div className="brand nav-logo">
            <img src="/newlogo.png" alt="Elevate" className="logo-icon" />
          </div>
          <div className="navlinks">
            <a href="#how">How it works</a>
          </div>
          <LoginDropdown id="loginWrap1" openWrap={openWrap} onToggle={toggleLogin} />
        </div>
      </div>

      <div className="shell">
        <div className="hero">
          <div className="hero-top">
            <div>
              <div className="eyebrow">
                <span style={{ width: 5, height: 5, background: "var(--lime)", borderRadius: "50%" }} />
                Resume intelligence
              </div>
              <h1>
                Find out what your
                <br />
                resume <span className="accent">actually says.</span>
              </h1>
              <p className="sub">
                Upload once. Get a real ATS score, your exact field match, a skill test built from your
                own resume, and a plan to close the gaps — no guesswork, no generic advice.
              </p>
              <div className="cta-row">
                {user ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => navigate("/upload")}
                  >
                    Analyze my resume
                  </button>
                ) : (
                  <GoogleSignInTrigger
                    onSignedIn={() => {
                      setCtaError(null);
                      navigate("/upload");
                    }}
                    onError={() => setCtaError("Sign-in failed. Please try again.")}
                  >
                    <button type="button" className="btn-primary" tabIndex={-1} aria-hidden="true">
                      Analyze my resume
                    </button>
                  </GoogleSignInTrigger>
                )}
                <LoginDropdown id="loginWrap2" openWrap={openWrap} onToggle={toggleLogin} large />
              </div>
              <div className="trust-note">
                No password to remember — sign in with the Google account you already use.
              </div>
              {ctaError && (
                <p style={{ color: "var(--coral-ink, #d54826)", fontSize: 12, marginTop: 8 }}>
                  {ctaError}
                </p>
              )}
            </div>

            <div className="hero-visual">
              <div className="hv-glow" />
              <div className="orbit-ring or-1" />
              <div className="orbit-ring or-2" />
              <div
                className="particle"
                style={{ width: 5, height: 5, background: "var(--lime)", top: 40, left: 380, animationDuration: "7s" }}
              />
              <div
                className="particle"
                style={{
                  width: 4,
                  height: 4,
                  background: "var(--teal)",
                  top: 340,
                  left: 20,
                  animationDuration: "9s",
                  animationDelay: "1s",
                }}
              />
              <div
                className="particle"
                style={{
                  width: 6,
                  height: 6,
                  background: "var(--amber)",
                  top: 200,
                  left: 400,
                  animationDuration: "6s",
                  animationDelay: "2s",
                }}
              />

              <div className="hero-photo">
                <img src="/photo.png" alt="Founder portrait" />
              </div>

              <div className="float-chip fc-1">
                <span className="fc-dot" />
                Field matched · 91%
              </div>
              <div className="float-chip fc-2">
                <span className="fc-dot" />
                Works for any field
              </div>
            </div>
          </div>

          <div className="stat-strip">
            <div className="stat">
              <div className="num">91%</div>
              <div className="lbl">Field-detection confidence, average</div>
            </div>
            <div className="stat">
              <div className="num">4</div>
              <div className="lbl">Scored categories per resume</div>
            </div>
            <div className="stat">
              <div className="num">1</div>
              <div className="lbl">Upload — score, test, and plan follow automatically</div>
            </div>
          </div>
        </div>

        <div className="section" id="how">
          <div className="section-head">
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              How it works
            </div>
            <h2>Three steps, <span className="brand-accent">one upload.</span></h2>
            <p>
              Everything downstream — the score, the test, the plan — is built from the same deep read
              of your resume, so it's specific to you instead of generic advice.
            </p>
          </div>
          <div className="steps">
            <div className="step-row">
              <div className="step-card-wrap">
                <div className="step-card has-image">
                  <div className="stepnum corner">01</div>
                  <img className="step-card-img" src="/deep-analysis.png" alt="Deep analysis" />
                </div>
              </div>
              <div className="step-text">
                <p>We detect your field, seniority, and exact skill set from the resume itself — not a form you fill out.</p>
              </div>
            </div>
            <div className="step-row reverse">
              <div className="step-card-wrap">
                <div className="step-card has-image">
                  <div className="stepnum corner">02</div>
                  <img className="step-card-img" src="/skill-test.png" alt="Skill test" />
                </div>
              </div>
              <div className="step-text">
                <p>A test generated from the specific skills on your resume, so results reflect what you actually know.</p>
              </div>
            </div>
            <div className="step-row">
              <div className="step-card-wrap">
                <div className="step-card has-image">
                  <div className="stepnum corner">03</div>
                  <img className="step-card-img" src="/course-plan.png" alt="Course plan" />
                </div>
              </div>
              <div className="step-text">
                <p>A prioritized plan targeting exactly where the test showed gaps — ordered weakest-first.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <div className="eyebrow" style={{ marginBottom: 16 }}>
              ATS breakdown
            </div>
            <h2>End to end Co operate <span className="brand-accent">ATS scanning</span></h2>
          </div>
          <div className="preview-card">
            <div className="preview-inner preview-inner-img">
              <img className="preview-img" src="/ats.png" alt="ATS score breakdown" />
            </div>
          </div>
        </div>

        <div className="final-cta">
          <div className="eyebrow" style={{ margin: "0 auto 16px", width: "fit-content" }}>
            Get started
          </div>
          <h2>
            Your resume already has a score.
            <br />
            Go find out what it is.
          </h2>
          <p>Free to try. One upload, sign in with Google, no card needed.</p>
          <LoginDropdown id="loginWrap3" openWrap={openWrap} onToggle={toggleLogin} large centered />
        </div>
      </div>
    </div>
    <SiteFooter />
    </>
  );
}
