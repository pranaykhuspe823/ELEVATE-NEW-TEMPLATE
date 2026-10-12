import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import CollegeLoginGate from "../components/college/CollegeLoginGate";
import { Segmented } from "../components/faculty/ui";
import { StatPill, StatRow } from "../components/common/StatPill";
import { CheckIcon, CopyIcon, SearchIcon, SparkIcon, TargetIcon, UsersIcon } from "../components/faculty/icons";
import { errorMessage, inputClass } from "../components/faculty/types";
import { DrivesHero, ErrorBanner, FitBar, SkillChip } from "../components/drives/parts";
import { parseSkillInput } from "../components/drives/skillParsing";

type Fit = "strong" | "medium" | "low";
type Filter = "all" | Fit | "none";

interface MatchRow {
  id: string;
  name: string | null;
  email: string;
  faculty: string | null;
  resumeId: string;
  atsScore: number | null;
  score: number;
  fit: Fit;
  matched: string[];
  missing: string[];
}

interface NoResumeRow {
  id: string;
  name: string | null;
  email: string;
  faculty: string | null;
}

interface MatchResult {
  skills: string[];
  totalStudents: number;
  students: MatchRow[];
  withoutResume: NoResumeRow[];
}

const FIT_BADGE: Record<Fit, { label: string; className: string }> = {
  strong: { label: "Strong fit", className: "bg-teal/10 text-teal border-teal/25" },
  medium: { label: "Medium fit", className: "bg-gold/10 text-gold border-gold/25" },
  low: { label: "Low fit", className: "bg-coral/10 text-coral border-coral/25" },
};

const SKILL_PREVIEW = 6;

function csvCell(v: string | number | null) {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(rows: MatchRow[], roleTitle: string) {
  const header = ["Name", "Email", "Faculty", "Fit", "Skill match %", "ATS score", "Matched skills", "Missing skills"];
  const lines = rows.map((r) =>
    [
      r.name,
      r.email,
      r.faculty,
      FIT_BADGE[r.fit].label,
      r.score,
      r.atsScore,
      r.matched.join("; "),
      r.missing.join("; "),
    ]
      .map(csvCell)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `job-match-${(roleTitle || "students").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function StudentRow({ row }: { row: MatchRow }) {
  const [expanded, setExpanded] = useState(false);
  const badge = FIT_BADGE[row.fit];
  const matched = expanded ? row.matched : row.matched.slice(0, SKILL_PREVIEW);
  const missing = expanded ? row.missing : row.missing.slice(0, SKILL_PREVIEW);
  const hidden =
    row.matched.length - matched.length + (row.missing.length - missing.length);

  return (
    <li className="px-4 sm:px-5 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-[15px] break-words">{row.name ?? row.email}</p>
            <span className={`rounded-full border px-2.5 py-0.5 text-[12px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="text-text-2 text-[13px] mt-0.5 break-words">
            {row.email}
            {row.faculty && ` · Faculty: ${row.faculty}`}
            {row.atsScore !== null && ` · ATS ${row.atsScore}`}
          </p>
        </div>
        <FitBar score={row.score} />
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {matched.map((s) => (
          <SkillChip key={`m-${s}`} tone="matched">
            {s}
          </SkillChip>
        ))}
        {missing.map((s) => (
          <SkillChip key={`x-${s}`} tone="missing">
            {s}
          </SkillChip>
        ))}
        {(hidden > 0 || expanded) && (
          <button
            type="button"
            className="text-[13px] font-medium text-lime hover:underline px-1"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : `+${hidden} more`}
          </button>
        )}
      </div>
    </li>
  );
}

export default function JobMatchPage() {
  const { user, loading } = useAuth();
  const [roleTitle, setRoleTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillDraft, setSkillDraft] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const counts = useMemo(() => {
    const list = result?.students ?? [];
    return {
      strong: list.filter((r) => r.fit === "strong").length,
      medium: list.filter((r) => r.fit === "medium").length,
      low: list.filter((r) => r.fit === "low").length,
      none: result?.withoutResume.length ?? 0,
    };
  }, [result]);

  const visible = useMemo(() => {
    if (!result || filter === "none") return [];
    const q = query.trim().toLowerCase();
    return result.students.filter(
      (r) =>
        (filter === "all" || r.fit === filter) &&
        (!q ||
          r.email.toLowerCase().includes(q) ||
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.faculty ?? "").toLowerCase().includes(q))
    );
  }, [result, filter, query]);

  if (loading) return null;
  if (!user || user.role !== "COLLEGE_ADMIN") return <CollegeLoginGate />;

  function addSkills(raw: string) {
    const incoming = parseSkillInput(raw);
    setSkills((prev) => {
      const seen = new Set(prev.map((s) => s.toLowerCase()));
      return [...prev, ...incoming.filter((s) => !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()))];
    });
    setSkillDraft("");
  }

  async function extract() {
    setIsExtracting(true);
    setError(null);
    try {
      const { data } = await api.post<{ skills: string[] }>("/api/drives/extract-skills", {
        description,
      });
      setSkills((prev) => {
        const seen = new Set(prev.map((s) => s.toLowerCase()));
        return [...prev, ...data.skills.filter((s) => !seen.has(s.toLowerCase()))];
      });
    } catch (err) {
      setError(errorMessage(err, "Couldn't extract skills. Type them in below instead."));
    } finally {
      setIsExtracting(false);
    }
  }

  async function match() {
    setIsMatching(true);
    setError(null);
    try {
      const { data } = await api.post<MatchResult>("/api/drives/match", { skills });
      setResult(data);
      setFilter("all");
      setQuery("");
    } catch (err) {
      setError(errorMessage(err, "Couldn't match students right now."));
    } finally {
      setIsMatching(false);
    }
  }

  async function copyEmails() {
    const emails = visible.map((r) => r.email).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy to the clipboard.");
    }
  }

  return (
    <div className="pt-6">
      <DrivesHero
        eyebrow="Job match"
        title="Find the right students for a placement"
        blurb="Paste a job description and see every student in your college sorted into strong, medium and low fit, based on the skills in their latest resume."
      >
        {result && (
          <StatRow>
            <StatPill tone="teal" icon={<CheckIcon width={15} height={15} strokeWidth={3} />} label="Strong" value={counts.strong} hint="70%+ match" />
            <StatPill tone="gold" icon={<TargetIcon width={15} height={15} />} label="Medium" value={counts.medium} hint="40–69% match" />
            <StatPill tone="coral" icon={<SparkIcon width={15} height={15} />} label="Low" value={counts.low} hint="under 40%" />
            <StatPill tone="teal" icon={<UsersIcon width={15} height={15} />} label="Students" value={result.totalStudents} hint={`${counts.none} without resume`} />
          </StatRow>
        )}
      </DrivesHero>

      <div className="mt-6">
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      </div>

      <section className="card !p-4 sm:!p-6">
        <h2 className="text-[17px] mb-4">1. The job</h2>
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Role (optional)</span>
            <input
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Data Analyst at Acme"
              className={inputClass}
              maxLength={120}
            />
          </label>
          <label className="grid gap-1.5">
            <span className="text-sm font-medium">Job description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description from the company here…"
              rows={7}
              maxLength={8000}
              className={`${inputClass} resize-y`}
            />
          </label>
          <div>
            <button
              type="button"
              className="btn btn-small inline-flex items-center gap-1.5 disabled:opacity-60"
              disabled={isExtracting || description.trim().length < 20}
              onClick={() => void extract()}
            >
              <SparkIcon width={13} height={13} />
              {isExtracting ? "Reading the description…" : "Extract required skills"}
            </button>
          </div>
        </div>

        <h2 className="text-[17px] mt-6 mb-1">2. Required skills</h2>
        <p className="text-text-2 text-[13px] mb-3">
          Students are scored on how many of these their resume shows. Click a skill to remove it.
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {skills.length === 0 && (
            <span className="text-text-3 text-sm">No skills yet: extract them or type them below.</span>
          )}
          {skills.map((s) => (
            <SkillChip
              key={s}
              onClick={() => setSkills((prev) => prev.filter((x) => x !== s))}
              title="Remove"
            >
              {s} <span aria-hidden="true">×</span>
            </SkillChip>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (skillDraft.trim()) addSkills(skillDraft);
          }}
        >
          <input
            value={skillDraft}
            onChange={(e) => setSkillDraft(e.target.value)}
            placeholder="Add skills, comma-separated (e.g. SQL, Power BI, Python)"
            className={`${inputClass} flex-1 min-w-0 !py-2`}
          />
          <button type="submit" className="btn btn-small" disabled={!skillDraft.trim()}>
            Add
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-60"
            disabled={isMatching || skills.length === 0}
            onClick={() => void match()}
          >
            <UsersIcon width={16} height={16} />
            {isMatching ? "Matching every student…" : result ? "Match again" : "Match students"}
          </button>
          {isMatching && (
            <span className="text-text-2 text-[13px]">This can take a few seconds for a large college.</span>
          )}
        </div>
      </section>

      {result && (
        <section className="mt-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <Segmented<Filter>
              label="Filter by fit"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: `All (${result.students.length})` },
                { value: "strong", label: `Strong (${counts.strong})` },
                { value: "medium", label: `Medium (${counts.medium})` },
                { value: "low", label: `Low (${counts.low})` },
                { value: "none", label: `No resume (${counts.none})` },
              ]}
            />
            {filter !== "none" && (
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <SearchIcon width={14} height={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, email, faculty"
                    aria-label="Search students"
                    className={`${inputClass} !py-2 !pl-8 w-[220px]`}
                  />
                </label>
                <button
                  type="button"
                  className="btn btn-small inline-flex items-center gap-1.5"
                  disabled={visible.length === 0}
                  onClick={() => void copyEmails()}
                >
                  <CopyIcon width={13} height={13} />
                  {copied ? "Copied!" : `Copy ${visible.length} emails`}
                </button>
                <button
                  type="button"
                  className="btn btn-small"
                  disabled={visible.length === 0}
                  onClick={() => downloadCsv(visible, roleTitle)}
                >
                  Download CSV
                </button>
              </div>
            )}
          </div>

          {filter === "none" ? (
            result.withoutResume.length === 0 ? (
              <div className="card">
                <p className="text-text-2 text-sm">Every student has an analysed resume.</p>
              </div>
            ) : (
              <ul className="card !p-0 overflow-hidden divide-y divide-border">
                {result.withoutResume.map((s) => (
                  <li key={s.id} className="px-4 sm:px-5 py-3">
                    <p className="font-semibold text-[15px]">{s.name ?? s.email}</p>
                    <p className="text-text-2 text-[13px]">
                      {s.email}
                      {s.faculty && ` · Faculty: ${s.faculty}`} · hasn't uploaded a resume yet, so can't be matched
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : visible.length === 0 ? (
            <div className="card">
              <p className="text-text-2 text-sm">
                {result.students.length === 0
                  ? "No students in your college have an analysed resume yet. Students appear here once they link to one of your faculty and upload a resume."
                  : "No students in this view."}
              </p>
            </div>
          ) : (
            <ul className="card !p-0 overflow-hidden divide-y divide-border">
              {visible.map((r) => (
                <StudentRow key={r.id} row={r} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
