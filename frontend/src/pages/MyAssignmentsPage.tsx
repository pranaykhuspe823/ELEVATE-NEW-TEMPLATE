import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { EmptyState, ProviderBadge, ScoreRing, Segmented } from "../components/faculty/ui";
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
  assignedBy: string;
  createdAt: string;
}

const STATUS_ORDER: Status[] = ["assigned", "in_progress", "completed"];
const STATUS_LABEL: Record<Status, string> = {
  assigned: "To do",
  in_progress: "Active",
  completed: "Done",
};

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

/** A compact 3-way status control: same idea as `Segmented`, but icon-only
 * so it stays a fixed, small size next to the title instead of stretching
 * with the label text. */
function StatusToggle({
  status,
  title,
  onChange,
}: {
  status: Status;
  title: string;
  onChange: (status: Status) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={`Progress for ${title}`}
      className="inline-flex items-center gap-1 rounded-full bg-card-2 p-1 flex-none"
    >
      {STATUS_ORDER.map((s) => {
        const active = s === status;
        const activeClass =
          s === "completed"
            ? "bg-teal text-white"
            : s === "in_progress"
            ? "bg-amber text-white"
            : "bg-border-strong text-text";
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            title={STATUS_LABEL[s]}
            onClick={() => onChange(s)}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition ${
              active ? activeClass : "text-text-3 hover:text-text hover:bg-white/70"
            }`}
          >
            {s === "completed" ? (
              <CheckIcon width={13} height={13} strokeWidth={3} />
            ) : s === "in_progress" ? (
              <span className="w-2.5 h-2.5 rounded-full bg-current" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full border-2 border-current" />
            )}
          </button>
        );
      })}
    </div>
  );
}

function AssignmentRow({
  assignment: a,
  onStatus,
}: {
  assignment: Assignment;
  onStatus: (a: Assignment, status: Status) => void;
}) {
  const done = a.status === "completed";
  const primary = a.resources.find((r) => r.title);
  const others = a.resources.filter((r) => r !== primary);
  const priorityLabel = `${a.priority.charAt(0).toUpperCase()}${a.priority.slice(1)}`;

  return (
    <li className="px-4 sm:px-5 py-3.5">
      <div className="flex items-start justify-between gap-3">
        <h2 className={`min-w-0 text-[15px] font-semibold leading-snug break-words ${done ? "text-text-2" : ""}`}>
          {a.title}
        </h2>
        <StatusToggle status={a.status} title={a.title} onChange={(next) => onStatus(a, next)} />
      </div>

      <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-text-2">
        <MetaChip icon={<ClockIcon width={10} height={10} />}>{formatHours(a.estimatedHours)}</MetaChip>
        <MetaChip icon={<span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[a.priority] ?? "bg-text-3"}`} />}>
          {priorityLabel}
        </MetaChip>
        <MetaChip icon={<BookIcon width={10} height={10} />}>{a.topic}</MetaChip>
        <span className="text-text-3">
          by {a.assignedBy} · {formatDate(a.createdAt)}
        </span>
      </p>

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

  async function changeStatus(a: Assignment, next: Status) {
    if (a.status === next) return;
    setAssignments(
      (prev) =>
        prev?.map((x) => (x.id === a.id ? { ...x, status: next } : x)) ?? null
    );
    try {
      await api.patch(`/api/assignments/${a.id}`, { status: next });
    } catch {
      load();
    }
  }

  const stats = useMemo(() => {
    const list = assignments ?? [];
    const count = (s: Status) => list.filter((a) => a.status === s).length;
    const completed = count("completed");
    const hoursLeft = list
      .filter((a) => a.status !== "completed")
      .reduce((sum, a) => sum + a.estimatedHours, 0);
    return {
      total: list.length,
      todo: count("assigned"),
      active: count("in_progress"),
      completed,
      hoursLeft,
      percent: list.length === 0 ? 0 : Math.round((completed / list.length) * 100),
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
              ? "Nothing assigned to you yet. When your faculty assigns a course, it shows up here."
              : "Nothing assigned to you yet. Link yourself to your faculty member with their share code, and the courses they assign will show up here."}
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-lime">
              <SparkIcon width={11} height={11} />
              My learning plan
            </span>
            <h1 className="text-[22px] sm:text-[26px] leading-tight text-text mt-2">
              My assignments
            </h1>
            <p className="text-text font-semibold text-[16px] mt-2 max-w-[560px] leading-relaxed">
              {remaining === 0
                ? "You're all caught up — every assigned course is complete. Nice work!"
                : `${remaining} ${remaining === 1 ? "course" : "courses"} to go · about ${formatHours(
                    stats.hoursLeft
                  )} of learning left. Your faculty can see your progress.`}
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
            <AssignmentRow key={a.id} assignment={a} onStatus={changeStatus} />
          ))}
        </ul>
      )}
    </div>
  );
}
