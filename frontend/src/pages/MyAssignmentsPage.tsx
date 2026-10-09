import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import {
  AtsBoostBadge,
  EmptyState,
  ProviderBadge,
  ScoreRing,
  Segmented,
} from "../components/faculty/ui";
import { StatPill, StatRow } from "../components/common/StatPill";
import {
  BookIcon,
  CheckIcon,
  ClockIcon,
  ExternalIcon,
  SparkIcon,
} from "../components/faculty/icons";
import { formatDate } from "../components/faculty/types";

interface Resource {
  platform: string;
  type: string;
  url: string;
  title?: string;
}

type Status = "assigned" | "in_progress" | "completed";
type Filter = "all" | Status;

interface Assignment {
  id: string;
  title: string;
  topic: string;
  priority: string;
  estimatedHours: number;
  resources: Resource[];
  reason: string | null;
  status: Status;
  progressPercent: number;
  keywords: string[];
  atsBoost: number;
  /** null = started by the student from their test results' recommendations. */
  assignedBy: string | null;
  createdAt: string;
}

// Mirrors backend/src/lib/courseProgress.ts's statusForProgress().
function statusForProgress(percent: number): Status {
  if (percent >= 100) return "completed";
  return percent > 0 ? "in_progress" : "assigned";
}

const SAVE_DELAY_MS = 500;

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-coral",
  medium: "bg-amber",
  low: "bg-text-3",
};

function formatHours(hours: number) {
  return `${Math.round(hours * 10) / 10}h`;
}

function MetaChip({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-card-2 px-2 py-0.5 text-[11px] font-medium text-text-2">
      {icon}
      {children}
    </span>
  );
}

/** Drag to report how far through the course you are. Saves shortly after
 * you stop moving it, rather than on every step. */
function ProgressControl({
  value,
  title,
  onChange,
}: {
  value: number;
  title: string;
  onChange: (percent: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const pending = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (pending.current === null) setDraft(value);
  }, [value]);

  // Leaving the page mid-drag still saves the last position.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      if (pending.current !== null) onChangeRef.current(pending.current);
    },
    []
  );

  function update(next: number) {
    setDraft(next);
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      pending.current = null;
      onChangeRef.current(next);
    }, SAVE_DELAY_MS);
  }

  const done = draft >= 100;
  return (
    <div className="flex items-center gap-2.5 w-full sm:w-[240px] flex-none">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={draft}
        onChange={(e) => update(Number(e.target.value))}
        aria-label={`Progress on ${title}`}
        aria-valuetext={`${draft}% complete`}
        className={`flex-1 h-1.5 cursor-pointer ${done ? "accent-teal" : "accent-lime"}`}
      />
      <span
        className={`w-[52px] text-right font-mono text-xs font-semibold ${done ? "text-teal" : "text-text"}`}
      >
        {done ? (
          <span className="inline-flex items-center gap-0.5">
            <CheckIcon width={11} height={11} strokeWidth={3} /> 100%
          </span>
        ) : (
          `${draft}%`
        )}
      </span>
    </div>
  );
}

function AssignmentRow({
  assignment: a,
  onProgress,
}: {
  assignment: Assignment;
  onProgress: (a: Assignment, percent: number) => void;
}) {
  const done = a.status === "completed";
  const primary = a.resources.find((r) => r.title);
  const others = a.resources.filter((r) => r !== primary);
  const priorityLabel = `${a.priority.charAt(0).toUpperCase()}${a.priority.slice(1)}`;

  return (
    <li className="px-4 sm:px-5 py-3.5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 className={`text-[15px] font-semibold leading-snug break-words ${done ? "text-text-2" : ""}`}>
            {a.title}
          </h2>
          <AtsBoostBadge points={a.atsBoost} keywords={a.keywords} />
        </div>
        <ProgressControl
          value={a.progressPercent}
          title={a.title}
          onChange={(percent) => onProgress(a, percent)}
        />
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-text-2">
        <MetaChip icon={<ClockIcon width={10} height={10} />}>{formatHours(a.estimatedHours)}</MetaChip>
        <MetaChip icon={<span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[a.priority] ?? "bg-text-3"}`} />}>
          {priorityLabel}
        </MetaChip>
        <MetaChip icon={<BookIcon width={10} height={10} />}>{a.topic}</MetaChip>
        <span className="text-text-3">
          {a.assignedBy ? `by ${a.assignedBy}` : "Started by you"} · {formatDate(a.createdAt)}
        </span>
      </p>

      {a.keywords.length > 0 && !done && (
        <p className="mt-1.5 text-xs text-text-2">
          When you finish, add <span className="font-medium text-text">{a.keywords.join(", ")}</span>{" "}
          to your resume and re-upload it to raise your ATS score.
        </p>
      )}

      {a.reason && (
        <p className="mt-2 border-l-2 border-lime-ink/60 pl-3 text-xs italic text-text-2 leading-relaxed break-words">
          <span className="not-italic font-medium text-lime-ink">Note from {a.assignedBy}:</span>{" "}
          “{a.reason}”
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
        {primary && (
          <>
            <a
              href={primary.url}
              target="_blank"
              rel="noopener noreferrer"
              title={primary.title}
              className="btn btn-small btn-primary inline-flex items-center gap-1.5 no-underline"
            >
              Open course <ExternalIcon width={12} height={12} />
            </a>
            <ProviderBadge provider={primary.platform} />
          </>
        )}
        {others.length > 0 && (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="text-text-3">{primary ? "Also on" : "Find it on"}</span>
            {others.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                title={r.title}
                className="inline-flex items-center gap-1 text-text-2 hover:text-lime hover:underline"
              >
                {r.title ? `${r.platform}: ${r.title}` : r.platform}
                <ExternalIcon width={10} height={10} />
              </a>
            ))}
          </span>
        )}
      </div>
    </li>
  );
}

function PageSkeleton() {
  return (
    <div className="pt-6 animate-pulse" aria-busy="true" aria-label="Loading assignments">
      <div className="h-[150px] rounded-[20px] bg-card-2" />
      <div className="mt-6 h-[360px] rounded-card bg-card-2" />
    </div>
  );
}

export default function MyAssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  function load() {
    api
      .get<{ assignments: Assignment[] }>("/api/assignments/me")
      .then(({ data }) => setAssignments(data.assignments))
      .catch(() => setError("Couldn't load your assigned courses."));
  }

  useEffect(load, []);

  async function changeProgress(a: Assignment, percent: number) {
    setAssignments(
      (prev) =>
        prev?.map((x) =>
          x.id === a.id
            ? { ...x, progressPercent: percent, status: statusForProgress(percent) }
            : x
        ) ?? null
    );
    try {
      await api.patch(`/api/assignments/${a.id}`, { progressPercent: percent });
    } catch {
      load();
    }
  }

  const stats = useMemo(() => {
    const list = assignments ?? [];
    const count = (s: Status) => list.filter((a) => a.status === s).length;
    const completed = count("completed");
    // Hours left scale with how much of each course is still to go.
    const hoursLeft = list.reduce(
      (sum, a) => sum + a.estimatedHours * (1 - a.progressPercent / 100),
      0
    );
    return {
      total: list.length,
      todo: count("assigned"),
      active: count("in_progress"),
      completed,
      hoursLeft,
      percent:
        list.length === 0
          ? 0
          : Math.round(list.reduce((sum, a) => sum + a.progressPercent, 0) / list.length),
    };
  }, [assignments]);

  const visible = useMemo(
    () =>
      (assignments ?? []).filter((a) => filter === "all" || a.status === filter),
    [assignments, filter]
  );

  if (error) {
    return (
      <div className="pt-6">
        <div className="card border-coral/30 bg-coral/5">
          <p className="text-coral text-sm" role="alert">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!assignments) return <PageSkeleton />;

  if (assignments.length === 0) {
    return (
      <div className="pt-6">
        <p className="eyebrow">My learning</p>
        <h1 className="text-[28px] leading-tight mb-6">My assignments</h1>
        <div className="max-w-[560px]">
          <EmptyState icon={<BookIcon width={26} height={26} />}>
            {user?.facultyId
              ? "No courses yet. Take a skill test from your resume analysis and start a recommended course, or wait for your faculty to assign one."
              : "No courses yet. Take a skill test from your resume analysis to get recommended courses, or link yourself to your faculty member with their share code so they can assign some."}
          </EmptyState>
          {!user?.facultyId && (
            <div className="text-center mt-5">
              <Link to="/upload" className="btn btn-primary btn-small no-underline">
                Enter your faculty code
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const remaining = stats.total - stats.completed;

  return (
    <div className="pt-6">
      <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-5 py-[18px] sm:px-7 sm:py-5 shadow-lg">
        <div className="relative flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-lime">
              <SparkIcon width={12} height={12} />
              My learning plan
            </span>
            <h1 className="text-[22px] sm:text-[26px] leading-tight text-text mt-2">
              My assignments
            </h1>
            <p className="text-text font-semibold text-[16px] mt-2 max-w-[560px] leading-relaxed">
              {remaining === 0
                ? "You're all caught up — every course is complete. Nice work!"
                : `${remaining} ${remaining === 1 ? "course" : "courses"} to go · about ${formatHours(
                    stats.hoursLeft
                  )} of learning left.${user?.facultyId ? " Your faculty can see your progress." : ""}`}
            </p>
          </div>
          <ScoreRing score={stats.percent} size={72} label="% done" />
        </div>
        <div className="relative mt-4">
          <StatRow>
            <StatPill tone="gold" icon={<BookIcon width={15} height={15} />} label="To do" value={stats.todo} hint="not started" />
            <StatPill tone="teal" icon={<SparkIcon width={15} height={15} />} label="Active" value={stats.active} hint="in progress" />
            <StatPill tone="teal" icon={<CheckIcon width={15} height={15} strokeWidth={3} />} label="Done" value={stats.completed} hint="completed" />
            <StatPill tone="coral" icon={<ClockIcon width={15} height={15} />} label="Left" value={formatHours(stats.hoursLeft)} hint="of learning" />
          </StatRow>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-6 mb-4">
        <h2 className="text-[17px]">Your courses</h2>
        <Segmented<Filter>
          label="Filter courses"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${stats.total})` },
            { value: "assigned", label: `To do (${stats.todo})` },
            { value: "in_progress", label: `Active (${stats.active})` },
            { value: "completed", label: `Done (${stats.completed})` },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <div className="card">
          <p className="text-text-2 text-sm">No courses in this view.</p>
        </div>
      ) : (
        <ul className="card !p-0 overflow-hidden divide-y divide-border">
          {visible.map((a) => (
            <AssignmentRow key={a.id} assignment={a} onProgress={changeProgress} />
          ))}
        </ul>
      )}
    </div>
  );
}
