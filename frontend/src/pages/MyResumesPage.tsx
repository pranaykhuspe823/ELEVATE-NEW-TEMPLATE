import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { EmptyState, ScoreRing } from "../components/faculty/ui";
import { StatPill, StatRow } from "../components/common/StatPill";
import {
  BookIcon,
  FileIcon,
  SparkIcon,
  TargetIcon,
  UploadIcon,
} from "../components/faculty/icons";
import { errorMessage, formatDate } from "../components/faculty/types";

type Status = "pending" | "processing" | "ready" | "failed";

interface ResumeSummary {
  id: string;
  filename: string;
  uploadedAt: string;
  status: Status;
  processingError: string | null;
  ats: {
    totalScore: number;
    formattingScore: number;
    keywordScore: number;
    impactScore: number;
    structureScore: number;
  } | null;
  field: { detectedField: string; seniority: string } | null;
  testCount: number;
  interviewCount: number;
}

const STATUS_BADGE: Record<Status, { label: string; className: string }> = {
  ready: { label: "Analysed", className: "bg-teal/10 text-teal" },
  processing: { label: "Analysing…", className: "bg-gold/10 text-gold" },
  pending: { label: "Queued", className: "bg-gold/10 text-gold" },
  failed: { label: "Failed", className: "bg-coral/10 text-coral" },
};

function PageSkeleton() {
  return (
    <div className="pt-6 animate-pulse" aria-busy="true" aria-label="Loading resumes">
      <div className="h-[150px] rounded-[20px] bg-card-2" />
      <div className="mt-6 h-[360px] rounded-card bg-card-2" />
    </div>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl bg-card-2/70 px-2.5 py-2 text-center">
      <p className="text-text-2 text-[11px] leading-tight truncate">{label}</p>
      <p className="text-[15px] font-semibold leading-tight mt-0.5">
        {value}
        <span className="text-text-3 text-[11px] font-normal">/25</span>
      </p>
    </div>
  );
}

function ResumeRow({ resume, delta }: { resume: ResumeSummary; delta: number | null }) {
  const badge = STATUS_BADGE[resume.status] ?? STATUS_BADGE.pending;
  return (
    <li className="card !p-4 sm:!p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-4 min-w-0 flex-1">
        {resume.ats ? (
          <ScoreRing score={resume.ats.totalScore} size={64} />
        ) : (
          <span className="flex-none w-16 h-16 rounded-full bg-card-2 text-text-3 flex items-center justify-center">
            <FileIcon width={22} height={22} />
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-[15px] leading-snug break-words">{resume.filename}</p>
          <p className="text-text-2 text-[13px] mt-0.5">
            Uploaded {formatDate(resume.uploadedAt)}
            {resume.field &&
              ` · ${resume.field.detectedField} (${resume.field.seniority})`}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
            {delta !== null && delta !== 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                  delta > 0 ? "bg-teal/10 text-teal" : "bg-coral/10 text-coral"
                }`}
                title="Change in ATS score from your previous resume"
              >
                {delta > 0 ? `▲ +${delta}` : `▼ ${delta}`} vs previous
              </span>
            )}
            {resume.testCount > 0 && (
              <span className="text-text-3 text-[12px]">
                {resume.testCount} {resume.testCount === 1 ? "test" : "tests"}
              </span>
            )}
            {resume.interviewCount > 0 && (
              <span className="text-text-3 text-[12px]">
                {resume.interviewCount}{" "}
                {resume.interviewCount === 1 ? "interview" : "interviews"}
              </span>
            )}
          </div>
          {resume.status === "failed" && resume.processingError && (
            <p className="text-coral text-[12px] mt-1.5 break-words">{resume.processingError}</p>
          )}
        </div>
      </div>

      {resume.ats && (
        <div className="grid grid-cols-4 gap-2 sm:w-[340px] flex-none">
          <SubScore label="Format" value={resume.ats.formattingScore} />
          <SubScore label="Keywords" value={resume.ats.keywordScore} />
          <SubScore label="Impact" value={resume.ats.impactScore} />
          <SubScore label="Structure" value={resume.ats.structureScore} />
        </div>
      )}

      <Link
        to={`/resumes/${resume.id}`}
        className="btn btn-small no-underline flex-none self-start sm:self-center"
      >
        {resume.status === "failed" ? "Open & retry" : "View analysis"}
      </Link>
    </li>
  );
}

export default function MyResumesPage() {
  const [resumes, setResumes] = useState<ResumeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get<{ resumes: ResumeSummary[] }>("/api/resumes")
      .then(({ data }) => {
        if (!cancelled) setResumes(data.resumes);
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Couldn't load your resumes."));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const scored = (resumes ?? []).filter((r) => r.ats);
    const scores = scored.map((r) => r.ats!.totalScore);
    return {
      total: resumes?.length ?? 0,
      latest: scores[0] ?? null,
      best: scores.length ? Math.max(...scores) : null,
      first: scores.length ? scores[scores.length - 1] : null,
    };
  }, [resumes]);

  // Each scored resume vs the next-older scored one (list is newest first).
  const deltas = useMemo(() => {
    const map = new Map<string, number>();
    const scored = (resumes ?? []).filter((r) => r.ats);
    scored.forEach((r, i) => {
      const older = scored[i + 1];
      if (older) map.set(r.id, r.ats!.totalScore - older.ats!.totalScore);
    });
    return map;
  }, [resumes]);

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

  if (!resumes) return <PageSkeleton />;

  if (resumes.length === 0) {
    return (
      <div className="pt-6">
        <p className="eyebrow">My history</p>
        <h1 className="text-[28px] leading-tight mb-6">My resumes</h1>
        <div className="max-w-[560px]">
          <EmptyState icon={<FileIcon width={26} height={26} />}>
            You haven't uploaded a resume yet. Every resume you upload, with its
            ATS score and analysis, will show up here.
          </EmptyState>
          <div className="text-center mt-5">
            <Link to="/upload" className="btn btn-primary btn-small no-underline">
              Upload your resume
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const improvement =
    stats.latest !== null && stats.first !== null ? stats.latest - stats.first : null;

  return (
    <div className="pt-6">
      <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-5 py-[18px] sm:px-7 sm:py-5 shadow-lg">
        <div className="relative flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-lime">
              <SparkIcon width={12} height={12} />
              My history
            </span>
            <h1 className="text-[22px] sm:text-[26px] leading-tight text-text mt-2">
              My resumes
            </h1>
            <p className="text-text font-semibold text-[16px] mt-2 max-w-[560px] leading-relaxed">
              {improvement !== null && stats.total > 1
                ? improvement > 0
                  ? `Your ATS score is up ${improvement} points since your first resume.`
                  : improvement < 0
                  ? `Your latest ATS score is ${-improvement} points below your first. Check the fix suggestions.`
                  : "Your ATS score is the same as your first resume."
                : "Every resume you've uploaded, with its ATS score and full analysis."}
            </p>
          </div>
          <ScoreRing score={stats.latest} size={72} label="Latest" />
        </div>
        <div className="relative mt-4">
          <StatRow>
            <StatPill tone="teal" icon={<FileIcon width={15} height={15} />} label="Resumes" value={stats.total} hint="uploaded" />
            <StatPill tone="gold" icon={<TargetIcon width={15} height={15} />} label="Latest" value={stats.latest ?? "—"} hint="ATS score" />
            <StatPill tone="teal" icon={<SparkIcon width={15} height={15} />} label="Best" value={stats.best ?? "—"} hint="ATS score" />
            <StatPill tone="coral" icon={<BookIcon width={15} height={15} />} label="First" value={stats.first ?? "—"} hint="ATS score" />
          </StatRow>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 mt-6 mb-4">
        <h2 className="text-[17px]">All uploads</h2>
        <Link to="/upload" className="btn btn-primary btn-small no-underline inline-flex items-center gap-1.5">
          <UploadIcon width={14} height={14} />
          Upload new
        </Link>
      </div>

      <ul className="flex flex-col gap-3">
        {resumes.map((r) => (
          <ResumeRow key={r.id} resume={r} delta={deltas.get(r.id) ?? null} />
        ))}
      </ul>
    </div>
  );
}
