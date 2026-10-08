import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../../lib/api";
import PlanLocked from "../faculty/PlanLocked";
import { ArrowLeftIcon, TargetIcon, UsersIcon } from "../faculty/icons";
import { CardHeader, CompactKpi, EmptyState } from "../faculty/ui";
import { errorMessage } from "../faculty/types";
import { CompanyMark, DriveMeta, ErrorBanner, FitBar, SkillChip } from "./parts";
import { FIT_BAR, type ReadinessResponse } from "./types";

function BackLink() {
  return (
    <Link
      to="/drives"
      className="inline-flex items-center gap-1.5 text-sm text-text-2 hover:text-lime transition mb-3"
    >
      <ArrowLeftIcon width={15} height={15} /> All campus drives
    </Link>
  );
}

function PageSkeleton() {
  return (
    <div className="pt-4 animate-pulse" aria-busy="true" aria-label="Loading drive">
      <div className="h-4 w-32 rounded bg-card-2 mb-3" />
      <div className="h-[190px] rounded-[20px] bg-card-2" />
      <div className="mt-4 h-[300px] rounded-card bg-card-2" />
    </div>
  );
}

function BucketBar({
  buckets,
  total,
}: {
  buckets: { strong: number; partial: number; low: number };
  total: number;
}) {
  const parts = [
    { key: "strong", label: "Strong fit", hint: "70%+ of skills", n: buckets.strong },
    { key: "partial", label: "Partial fit", hint: "40–69%", n: buckets.partial },
    { key: "low", label: "Needs work", hint: "under 40%", n: buckets.low },
  ] as const;

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-card-2" role="img" aria-label="Readiness split">
        {parts.map((p) =>
          p.n > 0 ? (
            <div
              key={p.key}
              className={FIT_BAR[p.key]}
              style={{ width: `${(p.n / total) * 100}%` }}
              title={`${p.label}: ${p.n}`}
            />
          ) : null
        )}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-3">
        {parts.map((p) => (
          <li key={p.key}>
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <span className={`w-2.5 h-2.5 rounded-sm ${FIT_BAR[p.key]}`} />
              {p.label}
            </p>
            <p className="font-display font-semibold text-[22px] leading-tight mt-0.5">{p.n}</p>
            <p className="text-[11.5px] text-text-2">{p.hint}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function StaffDriveDetail({ role }: { role: "FACULTY" | "COLLEGE_ADMIN" }) {
  const { id } = useParams();
  const [data, setData] = useState<ReadinessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [showFullJd, setShowFullJd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    api
      .get<ReadinessResponse>(`/api/drives/${id}/readiness`)
      .then(({ data }) => {
        if (!cancelled) setData(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 402) {
          setLocked(err.response.data?.error ?? "Your college's plan has expired.");
        } else if (axios.isAxiosError(err) && err.response?.status === 404) {
          setError("This drive doesn't exist, or isn't from your college.");
        } else {
          setError(errorMessage(err, "Couldn't load this drive."));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (locked) return <PlanLocked message={locked} />;
  if (error) {
    return (
      <div className="pt-4">
        <BackLink />
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!data) return <PageSkeleton />;

  const { drive, summary, students } = data;
  const isFaculty = role === "FACULTY";
  const longJd = drive.description.length > 700;
  const jdText = longJd && !showFullJd ? `${drive.description.slice(0, 700).trimEnd()}…` : drive.description;
  const scope = isFaculty ? "your students" : "students across your college";

  return (
    <div className="pt-4">
      <BackLink />

      <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-6 py-5 sm:px-7 shadow-lg">
        <div className="relative flex items-center gap-4 sm:gap-5">
          <CompanyMark name={drive.companyName} size={56} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-lime">
              {isFaculty ? "Student readiness" : "College readiness"}
            </p>
            <h1 className="text-[24px] sm:text-[28px] leading-tight text-text mt-0.5 break-words">
              {drive.companyName}
            </h1>
            <p className="text-text-2 text-sm mt-0.5 break-words">{drive.roleTitle}</p>
            <div className="mt-2">
              <DriveMeta drive={drive} />
            </div>
          </div>
        </div>
        <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <CompactKpi label="Students" value={summary.totalStudents} hint={isFaculty ? "linked to you" : "linked to faculty"} />
          <CompactKpi
            label="With resume"
            value={summary.withResume}
            hint={summary.withoutResume > 0 ? `${summary.withoutResume} yet to upload` : "everyone uploaded"}
            hintClass={summary.withoutResume > 0 ? "text-coral" : "text-text-3"}
          />
          <CompactKpi
            label="Average fit"
            value={summary.averageScore === null ? "—" : `${summary.averageScore}%`}
            hint="skill match"
          />
          <CompactKpi label="Strong fit" value={summary.buckets.strong} hint="70%+ of skills" />
        </div>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {summary.withResume === 0 ? (
            <section className="card">
              <EmptyState icon={<UsersIcon width={26} height={26} />}>
                {summary.totalStudents === 0
                  ? `No ${scope} yet. Once students link to a faculty code and upload a resume, their fit shows up here.`
                  : `None of ${scope} have uploaded a resume yet, so there's nothing to match.`}
              </EmptyState>
            </section>
          ) : (
            <>
              <section className="card">
                <CardHeader
                  icon={<TargetIcon width={18} height={18} />}
                  title="How ready are they?"
                  subtitle={`${summary.withResume} ${summary.withResume === 1 ? "resume" : "resumes"} compared with the required skills`}
                />
                <BucketBar buckets={summary.buckets} total={summary.withResume} />
              </section>

              <section className="card">
                <CardHeader
                  title="Skills most students are missing"
                  subtitle={
                    isFaculty
                      ? "Good candidates for the courses you assign"
                      : "Where a workshop or training session would help most"
                  }
                />
                {summary.topGaps.length === 0 ? (
                  <p className="text-sm text-text-2">Nobody is missing any required skill.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {summary.topGaps.map((g) => {
                      const barClass = g.percent >= 50 ? FIT_BAR.low : FIT_BAR.partial;
                      return (
                        <li key={g.skill}>
                          <div className="flex items-center justify-between gap-3 text-[13.5px]">
                            <span className="font-medium min-w-0 break-words">{g.skill}</span>
                            <span className="text-text-2 flex-none tabular-nums">
                              {g.missingCount} of {summary.withResume} · {g.percent}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 rounded-full bg-card-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barClass}`}
                              style={{ width: `${Math.max(g.percent, 3)}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}

          {isFaculty && students && students.length > 0 && (
            <section className="card !p-0 overflow-hidden">
              <div className="px-5 pt-5 pb-3">
                <CardHeader
                  icon={<UsersIcon width={18} height={18} />}
                  title="Your students, best fit first"
                  subtitle="Open a student to assign courses for the skills they're missing"
                  dense
                />
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {students.map((s) => (
                  <li key={s.id}>
                    <Link
                      to={`/faculty/students/${s.id}`}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 px-5 py-3 no-underline text-text hover:bg-card-2/50 transition-colors"
                    >
                      <div className="min-w-0 sm:w-[210px] flex-none">
                        <p className="font-medium text-[14px] truncate">{s.name ?? s.email}</p>
                        {s.name && <p className="text-xs text-text-2 truncate">{s.email}</p>}
                      </div>
                      <div className="flex-none">
                        <FitBar score={s.score} />
                      </div>
                      <p className="flex flex-wrap gap-1.5 min-w-0 flex-1">
                        {s.missing.length === 0 ? (
                          <span className="text-xs font-medium text-teal">Has every skill</span>
                        ) : (
                          s.missing.map((m) => (
                            <SkillChip key={m} tone="missing">
                              {m}
                            </SkillChip>
                          ))
                        )}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {!isFaculty && summary.withResume > 0 && (
            <p className="text-xs text-text-3 leading-relaxed">
              You're seeing college-wide totals. Individual results stay with each student's
              faculty member.
            </p>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <section className="card">
            <CardHeader title="Required skills" subtitle={`${drive.skills.length} skills`} dense />
            <p className="flex flex-wrap gap-1.5">
              {drive.skills.map((s) => (
                <SkillChip key={s}>{s}</SkillChip>
              ))}
            </p>
          </section>
          <section className="card">
            <CardHeader title="Job description" dense />
            <p className="text-[13.5px] leading-relaxed whitespace-pre-line break-words">{jdText}</p>
            {longJd && (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-lime hover:underline"
                onClick={() => setShowFullJd((v) => !v)}
              >
                {showFullJd ? "Show less" : "Read the full description"}
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
