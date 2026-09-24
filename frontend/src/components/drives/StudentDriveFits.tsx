import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { TargetIcon } from "../faculty/icons";
import { CardHeader } from "../faculty/ui";
import { FitBar, SkillChip } from "./parts";
import { countdown } from "./types";

interface DriveFitRow {
  driveId: string;
  companyName: string;
  roleTitle: string;
  driveDate: string | null;
  score: number;
  missing: string[];
}

/** Faculty view: how this student fits each upcoming campus drive. Missing
 * skills are shortcuts into the course finder. */
export default function StudentDriveFits({
  studentId,
  studentFirstName,
  onFindCourse,
}: {
  studentId: string;
  studentFirstName: string;
  onFindCourse: (skill: string) => void;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "error" } | { status: "ok"; hasResume: boolean; fits: DriveFitRow[] }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    api
      .get<{ hasResume: boolean; fits: DriveFitRow[] }>(`/api/faculty/students/${studentId}/drive-fits`)
      .then(({ data }) => {
        if (!cancelled) setState({ status: "ok", ...data });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  // Nothing to say when there are no upcoming drives -- keep the page uncluttered.
  if (state.status === "ok" && state.hasResume && state.fits.length === 0) return null;

  return (
    <section className="card shadow-[0_1px_2px_rgba(31,41,55,0.04)]">
      <CardHeader
        icon={<TargetIcon width={18} height={18} />}
        title="Campus drive fit"
        subtitle={`How ${studentFirstName}'s resume matches upcoming companies`}
        dense
        right={
          <Link to="/drives" className="text-xs text-lime hover:underline flex-none">
            All drives
          </Link>
        }
      />

      {state.status === "loading" && (
        <div className="animate-pulse flex flex-col gap-2" aria-busy="true">
          <div className="h-10 rounded-lg bg-card-2" />
          <div className="h-10 rounded-lg bg-card-2" />
        </div>
      )}
      {state.status === "error" && (
        <p className="text-xs text-text-2">Couldn't load drive fit right now.</p>
      )}
      {state.status === "ok" && !state.hasResume && (
        <p className="text-xs text-text-2 leading-relaxed">
          {studentFirstName} hasn't uploaded a resume yet, so there's nothing to match against the
          upcoming drives.
        </p>
      )}
      {state.status === "ok" && state.hasResume && (
        <ul className="divide-y divide-border -my-1">
          {state.fits.map((f) => {
            const when = countdown({ driveDate: f.driveDate, status: "upcoming" });
            return (
              <li key={f.driveId} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to={`/drives/${f.driveId}`}
                      className="text-[14px] font-semibold text-text hover:text-lime no-underline break-words"
                    >
                      {f.companyName}
                    </Link>
                    <p className="text-xs text-text-2 break-words">
                      {f.roleTitle}
                      {when ? ` · ${when}` : ""}
                    </p>
                  </div>
                  <FitBar score={f.score} />
                </div>
                {f.missing.length > 0 ? (
                  <p className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11.5px] text-text-2">Find a course for:</span>
                    {f.missing.map((m) => (
                      <SkillChip
                        key={m}
                        tone="missing"
                        onClick={() => onFindCourse(m)}
                        title={`Search courses for ${m}`}
                      >
                        {m}
                      </SkillChip>
                    ))}
                  </p>
                ) : (
                  <p className="mt-2 text-xs font-medium text-teal">Has every required skill.</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
