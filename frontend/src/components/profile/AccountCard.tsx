import { useState } from "react";
import { Link } from "react-router-dom";
import type { AuthUser } from "../../lib/auth";
import { CheckIcon, CopyIcon, LinkIcon, ShieldIcon } from "../faculty/icons";
import { Badge, CardHeader } from "../faculty/ui";
import type { ProfileData } from "./types";

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the code stays visible to copy by hand.
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label={`Copy code ${code}`}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3.5 py-1.5 font-mono text-[14px] font-semibold tracking-wider hover:border-lime hover:text-lime transition"
    >
      {code}
      {copied ? (
        <CheckIcon width={13} height={13} className="text-teal" />
      ) : (
        <CopyIcon width={13} height={13} className="text-text-2" />
      )}
    </button>
  );
}

/** Read-only facts that belong to the account rather than the person, shaped
 * by role: how a student signs in and who their faculty is; a faculty
 * member's share code; nothing extra for a college admin. */
export default function AccountCard({
  user,
  profile,
}: {
  user: AuthUser;
  profile: ProfileData;
}) {
  if (user.role === "COLLEGE_ADMIN") return null;

  return (
    <section className="card !p-4 sm:!p-5">
      {user.role === "STUDENT" ? (
        <>
          <CardHeader
            dense
            icon={<ShieldIcon width={16} height={16} />}
            title="Sign-in & faculty"
            subtitle="How you sign in and who guides you"
          />
          <div className="flex flex-col gap-3.5">
            <div>
              <p className="text-[13px] font-semibold mb-1">Sign-in method</p>
              <Badge tone="navy">Google account</Badge>
              <p className="text-text-2 text-[13px] leading-relaxed mt-1.5">
                Your email and password are managed by Google, so there's
                nothing to change here. Your name and photo are yours to edit.
              </p>
            </div>
            <div className="border-t border-border pt-3.5">
              <p className="text-[13px] font-semibold mb-1">Your faculty</p>
              {profile.faculty ? (
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm">{profile.faculty.name ?? "Your faculty"}</span>
                  {profile.faculty.facultyCode && (
                    <Badge tone="neutral">{profile.faculty.facultyCode}</Badge>
                  )}
                </div>
              ) : (
                <p className="text-text-2 text-[13px] leading-relaxed">
                  You're not linked to a faculty member yet.{" "}
                  <Link to="/upload" className="text-lime font-medium hover:underline">
                    Enter their code
                  </Link>{" "}
                  to see courses they assign you.
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <CardHeader
            dense
            icon={<LinkIcon width={16} height={16} />}
            title="Your students"
            subtitle="How students find you"
          />
          <div className="flex flex-col gap-3">
            {user.facultyCode ? (
              <div>
                <p className="text-[13px] font-semibold mb-1.5">Share code</p>
                <CopyCode code={user.facultyCode} />
                <p className="text-text-2 text-[13px] leading-relaxed mt-1.5">
                  Students enter this on their upload screen to link to you.
                </p>
              </div>
            ) : null}
            {profile.college && (
              <div className={user.facultyCode ? "border-t border-border pt-3" : ""}>
                <p className="text-[13px] font-semibold mb-1">College</p>
                <p className="text-sm">{profile.college.name}</p>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
