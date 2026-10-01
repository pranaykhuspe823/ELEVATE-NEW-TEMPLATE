import { useState } from "react";
import { api } from "../lib/api";
import { useAuth, type AuthUser } from "../lib/auth";
import { errorMessage, inputClass } from "./faculty/types";
import { CheckIcon, LinkIcon } from "./faculty/icons";

/** Shown to students who haven't linked a faculty member yet. Once linked,
 * their faculty can see their ATS score / weak topics and assign courses. */
export default function FacultyLinkCard() {
  const { user, setUser } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [justLinked, setJustLinked] = useState(false);

  if (!user || user.role !== "STUDENT") return null;

  if (justLinked) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3.5 text-sm text-teal"
      >
        <CheckIcon width={18} height={18} className="flex-none" />
        <span>
          You're linked. Your faculty can now see your progress and assign you
          courses.
        </span>
      </div>
    );
  }

  if (user.facultyId) return null;

  async function handleJoin() {
    if (!code.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<{ user: AuthUser }>(
        "/api/auth/join-faculty",
        { code: code.trim() }
      );
      setJustLinked(true);
      setUser(data.user);
    } catch (err) {
      setError(errorMessage(err, "Couldn't link that code."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="card !p-4 sm:!p-5">
      <div className="flex items-start gap-3 mb-3.5">
        <span className="flex-none w-9 h-9 rounded-xl bg-lime/10 text-lime flex items-center justify-center">
          <LinkIcon width={16} height={16} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] leading-tight">Have a faculty code?</h2>
          <p className="text-text-2 text-[13px] leading-snug mt-0.5">
            Link your account so your faculty can see your progress and assign
            courses tailored to where you're lacking.
          </p>
        </div>
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleJoin();
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="FAC-XXXXXX"
          aria-label="Faculty code"
          autoComplete="off"
          className={`${inputClass} flex-1 min-w-0 font-mono uppercase tracking-wider !py-2`}
        />
        <button
          type="submit"
          className="btn btn-primary btn-small disabled:opacity-60"
          disabled={isSubmitting || !code.trim()}
        >
          {isSubmitting ? "Linking…" : "Link"}
        </button>
      </form>
      {error && (
        <p className="text-coral text-[13px] mt-2.5" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
