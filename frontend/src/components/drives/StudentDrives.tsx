import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/auth";
import PlanLocked from "../faculty/PlanLocked";
import { BuildingIcon, CheckIcon, ClockIcon, ExternalIcon, SparkIcon, TargetIcon } from "../faculty/icons";
import { EmptyState, Segmented } from "../faculty/ui";
import { StatPill, StatRow } from "../common/StatPill";
import {
  CompanyMark,
  DriveMeta,
  DrivesHero,
  ErrorBanner,
  FitBar,
  Skeleton,
  SkillChip,
} from "./parts";
import { skillSummary, type DriveWithFit } from "./types";
import { useDrives } from "./useDrives";

type Filter = "upcoming" | "completed" | "all";

function DriveRow({ drive }: { drive: DriveWithFit }) {
  const fit = drive.fit;
  const missing = fit ? skillSummary(fit.missing, 3) : null;
  const done = drive.status === "completed";

  return (
    <li>
      <Link
        to={`/drives/${drive.id}`}
        className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 px-4 sm:px-5 py-3.5 no-underline text-text hover:bg-card-2/50 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <CompanyMark name={drive.companyName} size={40} />
          <div className="min-w-0 flex-1">
            <h2 className={`text-[15px] font-semibold leading-snug break-words ${done ? "text-text-2" : ""}`}>
              {drive.companyName}
              <span className="text-text-2 font-normal"> · {drive.roleTitle}</span>
            </h2>
            <div className="mt-1.5">
              <DriveMeta drive={drive} />
            </div>
            {missing && missing.shown.length > 0 && (
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-text-2">
                <span>Build:</span>
                {missing.shown.map((s) => (
                  <SkillChip key={s} tone="missing">
                    {s}
                  </SkillChip>
                ))}
                {missing.extra > 0 && <span>+{missing.extra} more</span>}
              </p>
            )}
            {fit && fit.missing.length === 0 && (
              <p className="mt-2 text-xs font-medium text-teal">
                Your resume shows every skill they ask for.
              </p>
            )}
          </div>
        </div>
        <div className="flex sm:flex-col sm:items-end items-center justify-between gap-2 flex-none pl-[58px] sm:pl-0">
          {fit ? (
            <FitBar score={fit.score} />
          ) : (
            <span className="text-xs text-text-3">Fit not available</span>
          )}
          <span className="text-xs text-lime font-medium whitespace-nowrap">View details →</span>
        </div>
      </Link>
    </li>
  );
}

export default function StudentDrives() {
  const { user } = useAuth();
  const { data, error, locked } = useDrives();
  const [filter, setFilter] = useState<Filter | null>(null);

  const stats = useMemo(() => {
    const upcoming = (data?.drives ?? []).filter((d) => d.status !== "completed");
    const scored = upcoming.filter((d) => d.fit);
    const best = scored.reduce<DriveWithFit | null>(
      (acc, d) => (!acc || d.fit!.score > acc.fit!.score ? d : acc),
      null
    );
    const gaps = new Set<string>();
    for (const d of scored) for (const s of d.fit!.missing) gaps.add(s.toLowerCase());
    return {
      upcoming: upcoming.length,
      best,
      ready: scored.filter((d) => d.fit!.score >= 70).length,
      gaps: gaps.size,
    };
  }, [data]);

  if (locked) return <PlanLocked message={locked} />;
  if (error) {
    return (
      <div className="pt-6">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!data) return <Skeleton />;

  const drives = data.drives;
  const completed = drives.length - stats.upcoming;
  // Default to what matters now; fall back to everything if nothing is upcoming.
  const activeFilter: Filter = filter ?? (stats.upcoming > 0 ? "upcoming" : "all");
  const visible = drives.filter((d) =>
    activeFilter === "all" ? true : activeFilter === "completed" ? d.status === "completed" : d.status !== "completed"
  );
  const firstName = (user?.name ?? user?.email ?? "").trim().split(/\s+/)[0];

  return (
    <div className="pt-6">
      <DrivesHero
        eyebrow="Placement season"
        title="Campus drives"
        blurb={
          !data.linked
            ? "Companies visiting your campus show up here, with how well your resume fits each one."
            : data.hasResume
            ? `${firstName ? `${firstName}, ` : ""}here's how your resume stacks up against every company coming to campus — and what to work on for each.`
            : "Companies visiting your campus show up here. Upload your resume to see how well you fit each one."
        }
      >
        {data.linked && drives.length > 0 && (
          <StatRow>
            <StatPill
              tone="gold"
              icon={<ClockIcon width={15} height={15} />}
              label="Upcoming"
              value={stats.upcoming}
              hint="on campus"
            />
            <StatPill
              tone="teal"
              icon={<TargetIcon width={15} height={15} />}
              label="Best fit"
              value={stats.best?.fit ? `${stats.best.fit.score}%` : "—"}
              hint={stats.best ? stats.best.companyName : "Upload resume"}
            />
            <StatPill
              tone="teal"
              icon={<CheckIcon width={15} height={15} strokeWidth={3} />}
              label="Ready"
              value={data.hasResume ? stats.ready : "—"}
              hint="70%+ match"
            />
            <StatPill
              tone="coral"
              icon={<SparkIcon width={15} height={15} />}
              label="To build"
              value={data.hasResume ? stats.gaps : "—"}
              hint="skill gaps"
            />
          </StatRow>
        )}
      </DrivesHero>

      {!data.linked ? (
        <div className="max-w-[560px] mt-6">
          <EmptyState icon={<BuildingIcon width={26} height={26} />}>
            Campus drives are shared by your college's placement cell. Link yourself to your
            faculty member with their share code and the companies visiting your campus will
            appear here.
          </EmptyState>
          <div className="text-center mt-5">
            <Link to="/upload" className="btn btn-primary btn-small no-underline">
              Enter your faculty code
            </Link>
          </div>
        </div>
      ) : (
        <>
          {!data.hasResume && drives.length > 0 && (
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3.5">
              <p className="text-sm leading-relaxed">
                <strong>Upload your resume</strong> to see your skill match for each company and
                get a plan to close the gaps.
              </p>
              <Link to="/upload" className="btn btn-primary btn-small no-underline flex-none text-center">
                Upload resume
              </Link>
            </div>
          )}
          {data.fitError && (
            <div className="mt-5">
              <ErrorBanner message="Skill matching is unavailable right now, so fit scores are hidden. Try again in a moment." />
            </div>
          )}

          {drives.length === 0 ? (
            <div className="max-w-[560px] mt-6">
              <EmptyState icon={<TargetIcon width={26} height={26} />}>
                No companies have been added yet. When your placement cell (TPO) adds a campus
                drive, it shows up here with the job description and your fit.
              </EmptyState>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 mb-3">
                <h2 className="text-[18px]">Companies</h2>
                <Segmented<Filter>
                  label="Filter drives"
                  value={activeFilter}
                  onChange={setFilter}
                  options={[
                    { value: "upcoming", label: `Upcoming (${stats.upcoming})` },
                    { value: "completed", label: `Visited (${completed})` },
                    { value: "all", label: `All (${drives.length})` },
                  ]}
                />
              </div>
              {visible.length === 0 ? (
                <div className="card">
                  <p className="text-text-2 text-sm">No drives in this view.</p>
                </div>
              ) : (
                <ul className="card !p-0 overflow-hidden divide-y divide-border shadow-[0_1px_2px_rgba(31,41,55,0.04)]">
                  {visible.map((d) => (
                    <DriveRow key={d.id} drive={d} />
                  ))}
                </ul>
              )}
              <p className="mt-3 flex items-center gap-1.5 text-xs text-text-3">
                <ExternalIcon width={11} height={11} />
                Fit is matched from the skills on your latest resume. Upload a newer one any time and
                it updates.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
