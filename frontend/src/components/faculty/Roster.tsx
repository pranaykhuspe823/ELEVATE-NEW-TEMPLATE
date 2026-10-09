import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { BookIcon, CheckIcon, CopyIcon, SearchIcon, ShieldIcon, TargetIcon, UsersIcon } from "./icons";
import { Avatar, Badge, EmptyState, ProgressBar, Segmented } from "./ui";
import { StatPill, StatRow } from "../common/StatPill";
import CertificationsCard from "./CertificationsCard";
import { inputClass } from "./types";

export interface RosterStudent {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  hasResume: boolean;
  atsScore: number | null;
  detectedField: string | null;
  weakTopicCount: number;
  openAssignments: number;
  courseCount: number;
  /** Average % done across all their courses; null when they have none. */
  courseProgress: number | null;
  plagiarismFlagged: boolean;
}

type Filter = "all" | "attention" | "flagged";

// Student | Field | ATS | Weak topics | Courses | Status | arrow
const COLUMNS =
  "md:grid-cols-[minmax(0,2.3fr)_minmax(0,2fr)_88px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_20px]";

function needsAttention(s: RosterStudent) {
  return s.plagiarismFlagged || s.weakTopicCount > 0;
}

function AtsCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-text-3 text-sm">—</span>;
  const bar = score >= 75 ? "bg-teal" : score >= 50 ? "bg-amber" : "bg-coral";
  return (
    <div className="w-[72px]">
      <p className="leading-none">
        <span className="font-display font-semibold text-[20px]">{score}</span>
        <span className="text-text-3 text-xs"> /100</span>
      </p>
      <div className="h-1 rounded-full bg-card-2 mt-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full ${bar}`}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </div>
    </div>
  );
}

function Dash() {
  return <span className="text-text-3 text-sm">—</span>;
}

function CoursesCell({ student: s }: { student: RosterStudent }) {
  if (s.courseCount === 0 || s.courseProgress === null) {
    return (
      <span className="hidden md:inline">
        <Dash />
      </span>
    );
  }
  return (
    <div
      className="w-[120px]"
      title={`${s.courseCount} course${s.courseCount === 1 ? "" : "s"}, ${s.courseProgress}% done on average`}
    >
      <p className="leading-none text-[13px]">
        <span className="font-semibold">{s.courseProgress}%</span>
        <span className="text-text-3 text-xs">
          {" "}
          · {s.openAssignments > 0 ? `${s.openAssignments} open` : "all done"}
        </span>
      </p>
      <ProgressBar percent={s.courseProgress} className="mt-1.5" />
    </div>
  );
}

function StudentRow({ student: s }: { student: RosterStudent }) {
  return (
    <li>
      <Link
        to={`/faculty/students/${s.id}`}
        className={`group grid grid-cols-[minmax(0,1fr)_auto] ${COLUMNS} items-center gap-x-4 gap-y-2.5 px-4 sm:px-5 py-4 text-text no-underline transition-colors hover:bg-bg/80`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={s.name} email={s.email} url={s.avatarUrl} size={42} />
          <div className="min-w-0">
            <p className="text-[15.5px] font-semibold leading-snug truncate">
              {s.name ?? s.email}
            </p>
            <p className="text-text-2 text-[13.5px] truncate mt-0.5">{s.email}</p>
          </div>
        </div>

        <p className="col-span-2 md:col-span-1 text-[14px] text-text-2 leading-snug line-clamp-2 md:order-none">
          {s.detectedField ??
            (s.hasResume ? "Field not detected yet" : "No resume uploaded yet")}
        </p>

        <div className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
          <AtsCell score={s.atsScore} />
        </div>

        <div className="col-span-2 md:contents flex flex-wrap items-center gap-1.5">
          <div>
            {s.weakTopicCount > 0 ? (
              <Badge tone="amber">
                {s.weakTopicCount} weak topic{s.weakTopicCount === 1 ? "" : "s"}
              </Badge>
            ) : (
              <span className="hidden md:inline">
                <Dash />
              </span>
            )}
          </div>
          <div>
            <CoursesCell student={s} />
          </div>
          <div>
            {s.plagiarismFlagged ? (
              <Badge tone="coral">Plagiarism flag</Badge>
            ) : !s.hasResume ? (
              <Badge>No resume</Badge>
            ) : needsAttention(s) ? (
              <Badge tone="amber">Needs support</Badge>
            ) : (
              <Badge tone="teal">
                <CheckIcon width={11} height={11} /> On track
              </Badge>
            )}
          </div>
        </div>

        <span
          aria-hidden="true"
          className="hidden md:block text-text-3 group-hover:text-lime group-hover:translate-x-0.5 transition"
        >
          →
        </span>
      </Link>
    </li>
  );
}

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked (insecure context); the code stays visible to copy by hand.
    }
  }

  return (
    <div
      data-tour="share-code"
      className="flex items-center gap-3.5 rounded-2xl bg-white text-text border-2 border-border pl-5 pr-3 py-3 shadow flex-none"
    >
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-text-2">
          Your share code
        </p>
        <p className="font-mono text-[18px] font-semibold tracking-wider leading-tight mt-0.5">
          {code}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        className="btn btn-small !px-4 inline-flex items-center gap-1.5"
      >
        {copied ? (
          <>
            <CheckIcon width={13} height={13} /> Copied
          </>
        ) : (
          <>
            <CopyIcon width={13} height={13} /> Copy
          </>
        )}
      </button>
    </div>
  );
}

function ColumnHeader({ children }: { children: ReactNode }) {
  return (
    <span className="font-mono text-[11.5px] font-semibold uppercase tracking-[0.1em] text-text-2">
      {children}
    </span>
  );
}

export default function Roster({
  students,
  facultyCode,
}: {
  students: RosterStudent[];
  facultyCode: string | null;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const stats = useMemo(() => {
    const scored = students.filter((s) => s.atsScore !== null);
    const avg =
      scored.length === 0
        ? null
        : Math.round(
            scored.reduce((sum, s) => sum + (s.atsScore ?? 0), 0) / scored.length
          );
    return {
      total: students.length,
      avg,
      attention: students.filter(needsAttention).length,
      flagged: students.filter((s) => s.plagiarismFlagged).length,
      open: students.reduce((sum, s) => sum + s.openAssignments, 0),
    };
  }, [students]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Students who need a look come first: flagged, then most weak topics.
    const urgency = (s: RosterStudent) =>
      (s.plagiarismFlagged ? 100 : 0) + s.weakTopicCount;
    const ordered = [...students].sort(
      (a, b) =>
        urgency(b) - urgency(a) ||
        (a.name ?? a.email).localeCompare(b.name ?? b.email)
    );
    return ordered.filter((s) => {
      if (filter === "attention" && !needsAttention(s)) return false;
      if (filter === "flagged" && !s.plagiarismFlagged) return false;
      if (!q) return true;
      return (
        (s.name ?? "").toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.detectedField ?? "").toLowerCase().includes(q)
      );
    });
  }, [students, search, filter]);

  return (
    <div className="pt-6">
      <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-5 py-[18px] sm:px-7 sm:py-5 shadow-lg">
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-lime">
              <UsersIcon width={12} height={12} />
              Faculty dashboard
            </span>
            <h1 className="text-[22px] sm:text-[26px] leading-tight text-text mt-2">
              Your students
            </h1>
            <p className="text-text font-semibold text-[16px] mt-2 max-w-[560px] leading-relaxed">
              See who needs support at a glance, then open a student to assign
              courses and review their resume.
            </p>
          </div>
          {facultyCode && <ShareCode code={facultyCode} />}
        </div>

        <div className="relative mt-4" data-tour="faculty-stats">
          <StatRow>
            <StatPill tone="gold" icon={<UsersIcon width={15} height={15} />} label="Students" value={stats.total} hint="linked to you" />
            <StatPill
              tone="teal"
              icon={<TargetIcon width={15} height={15} />}
              label="Avg ATS"
              value={stats.avg === null ? "—" : stats.avg}
              hint={stats.avg === null ? "not scored" : "of resumes"}
            />
            <StatPill
              tone="coral"
              icon={<ShieldIcon width={15} height={15} />}
              label="Attention"
              value={stats.attention}
              hint="flagged"
            />
            <StatPill tone="teal" icon={<BookIcon width={15} height={15} />} label="Open" value={stats.open} hint="pending" />
          </StatRow>
        </div>
      </section>

      <CertificationsCard />

      {students.length === 0 ? (
        <div className="card mt-5" data-tour="faculty-roster">
          <EmptyState icon={<UsersIcon width={26} height={26} />}>
            No students have linked to you yet. Share your code
            {facultyCode ? ` (${facultyCode})` : ""} with them — they enter it
            from their upload screen and appear here.
          </EmptyState>
        </div>
      ) : (
        <section className="card !p-0 overflow-hidden mt-5" data-tour="faculty-roster">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border">
            <div className="relative sm:w-[320px]">
              <SearchIcon
                width={16}
                height={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or field"
                aria-label="Search students"
                className={`${inputClass} w-full !pl-10 !py-2 !text-sm`}
              />
            </div>
            <Segmented<Filter>
              size="sm"
              label="Filter students"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All (${stats.total})` },
                { value: "attention", label: `Need attention (${stats.attention})` },
                { value: "flagged", label: `Flagged (${stats.flagged})` },
              ]}
            />
          </div>

          <div
            className={`hidden md:grid ${COLUMNS} gap-x-4 px-5 py-2 bg-bg/70 border-b border-border`}
          >
            <ColumnHeader>Student</ColumnHeader>
            <ColumnHeader>Field</ColumnHeader>
            <ColumnHeader>ATS</ColumnHeader>
            <ColumnHeader>Weak topics</ColumnHeader>
            <ColumnHeader>Courses</ColumnHeader>
            <ColumnHeader>Status</ColumnHeader>
            <span />
          </div>

          {visible.length === 0 ? (
            <p className="text-text-2 text-sm px-5 py-6">
              No students match that search or filter.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((s) => (
                <StudentRow key={s.id} student={s} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
