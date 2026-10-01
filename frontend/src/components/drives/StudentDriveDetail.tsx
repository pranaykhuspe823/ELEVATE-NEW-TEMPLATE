import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import PlanLocked from "../faculty/PlanLocked";
import { ArrowLeftIcon, CheckIcon, SparkIcon, TargetIcon } from "../faculty/icons";
import { CardHeader, ScoreRing } from "../faculty/ui";
import { errorMessage } from "../faculty/types";
import GapCourses from "./GapCourses";
import { CompanyMark, DriveMeta, ErrorBanner, SkillChip } from "./parts";
import {
  FIT_LABEL,
  fitTone,
  type Drive,
  type DriveFit,
} from "./types";

interface DetailResponse {
  drive: Drive;
  hasResume: boolean;
  fit: DriveFit | null;
}

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
      <div className="h-[130px] rounded-[20px] bg-card-2" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="h-[320px] rounded-card bg-card-2" />
        <div className="h-[260px] rounded-card bg-card-2" />
      </div>
    </div>
  );
}

function verdict(score: number): string {
  const tone = fitTone(score);
  if (tone === "strong") return "Your resume already matches most of what they ask for.";
  if (tone === "partial") return "A solid base — closing a few gaps would make you a strong candidate.";
  return "There's a real gap here, but it's a clear list to work through before the drive.";
}

export default function StudentDriveDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsError, setTipsError] = useState<string | null>(null);
  const [showFullJd, setShowFullJd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .get<DetailResponse>(`/api/drives/${id}`)
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

  async function getTips() {
    setTipsLoading(true);
    setTipsError(null);
    try {
      const res = await api.post<{ fit: DriveFit }>(`/api/drives/${id}/tips`);
      setData((prev) => (prev ? { ...prev, fit: res.data.fit } : prev));
    } catch (err) {
      setTipsError(errorMessage(err, "Couldn't generate tips right now."));
    } finally {
      setTipsLoading(false);
    }
  }

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

  const { drive, fit } = data;
  const tips = fit?.tips ?? null;
  const advice = new Map((tips?.gaps ?? []).map((g) => [g.skill.toLowerCase(), g.advice]));
  const longJd = drive.description.length > 700;
  const jdText = longJd && !showFullJd ? `${drive.description.slice(0, 700).trimEnd()}…` : drive.description;
  const firstName = (user?.name ?? "").trim().split(/\s+/)[0];

  return (
    <div className="pt-4">
      <BackLink />

      <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-6 py-5 sm:px-7 shadow-lg">
        <div className="relative flex items-center gap-4 sm:gap-5">
          <CompanyMark name={drive.companyName} size={56} />
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-lime">
              Campus drive
            </p>
            <h1 className="text-[24px] sm:text-[28px] leading-tight text-text mt-0.5 break-words">
              {drive.companyName}
            </h1>
            <p className="text-text-2 text-sm mt-0.5 break-words">{drive.roleTitle}</p>
            <div className="mt-2">
              <DriveMeta drive={drive} />
            </div>
          </div>
          {fit && <ScoreRing score={fit.score} size={92} label="% fit" />}
        </div>
        {fit && (
          <p className="relative mt-4 text-sm text-text-2 border-t border-border pt-3">
            <strong className="text-text">{FIT_LABEL[fitTone(fit.score)]}.</strong>{" "}
            {firstName ? `${firstName}, ` : ""}
            {verdict(fit.score).charAt(0).toLowerCase() + verdict(fit.score).slice(1)}
          </p>
        )}
      </section>

      {!data.hasResume && (
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-3.5">
          <p className="text-sm leading-relaxed">
            <strong>Upload your resume</strong> to see which of these skills you already show and
            which to build.
          </p>
          <Link to="/upload" className="btn btn-primary btn-small no-underline flex-none text-center">
            Upload resume
          </Link>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="flex flex-col gap-4 min-w-0">
          <section className="card">
            <CardHeader
              icon={<TargetIcon width={18} height={18} />}
              title="Skills they ask for"
              subtitle={
                fit
                  ? `${fit.matched.length} of ${drive.skills.length} shown on your resume`
                  : `${drive.skills.length} required skills`
              }
            />
            <div className="flex flex-wrap gap-1.5">
              {fit ? (
                <>
                  {fit.matched.map((s) => (
                    <SkillChip key={`m-${s}`} tone="matched">
                      {s}
                    </SkillChip>
                  ))}
                  {fit.missing.map((s) => (
                    <SkillChip key={`x-${s}`} tone="missing">
                      {s}
                    </SkillChip>
                  ))}
                </>
              ) : (
                drive.skills.map((s) => <SkillChip key={s}>{s}</SkillChip>)
              )}
            </div>
            {fit && (
              <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal" /> On your resume
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-coral" /> Not shown yet
                </span>
              </p>
            )}
          </section>

          {fit && fit.missing.length > 0 && (
            <section className="card">
              <CardHeader
                icon={<SparkIcon width={18} height={18} />}
                title="Skills to build"
                subtitle="Your weak points for this company"
                right={
                  !tips ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-small flex-none disabled:opacity-60"
                      disabled={tipsLoading}
                      onClick={() => void getTips()}
                    >
                      {tipsLoading ? "Working on it…" : "Get tailored tips"}
                    </button>
                  ) : undefined
                }
              />
              {tipsError && (
                <p className="mb-3 text-sm text-coral" role="alert">
                  {tipsError}
                </p>
              )}
              <ul className="divide-y divide-border -my-1">
                {fit.missing.map((skill) => {
                  const note = advice.get(skill.toLowerCase());
                  return (
                    <li key={skill} className="py-3">
                      <div className="flex items-center gap-2">
                        <SkillChip tone="missing">{skill}</SkillChip>
                      </div>
                      {note && <p className="mt-1.5 text-[13.5px] leading-relaxed">{note}</p>}
                      <div className="mt-1.5">
                        <GapCourses skill={skill} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {!tips && !tipsLoading && (
                <p className="mt-3 text-xs text-text-2">
                  “Get tailored tips” writes a short plan for each gap, plus edits to make your
                  resume read better for this role.
                </p>
              )}
            </section>
          )}

          {fit && fit.missing.length === 0 && (
            <section className="card border-teal/30 bg-teal/5">
              <p className="flex items-start gap-2.5 text-sm leading-relaxed">
                <CheckIcon width={17} height={17} className="flex-none mt-0.5 text-teal" strokeWidth={3} />
                <span>
                  <strong>Your resume shows every skill listed.</strong> Focus on the job
                  description below and rehearse for the interview rounds.
                </span>
              </p>
            </section>
          )}

          {tips && tips.resumeTips.length > 0 && (
            <section className="card">
              <CardHeader
                icon={<SparkIcon width={18} height={18} />}
                title={`Tune your resume for ${drive.companyName}`}
                subtitle="Edits that make it read better for this role"
              />
              <ol className="flex flex-col gap-2.5 list-decimal pl-5 text-[13.5px] leading-relaxed marker:text-lime marker:font-semibold">
                {tips.resumeTips.map((t, i) => (
                  <li key={i} className="pl-1">
                    {t}
                  </li>
                ))}
              </ol>
              <Link to="/upload" className="btn btn-small mt-4 inline-block no-underline">
                Upload an updated resume
              </Link>
            </section>
          )}
        </div>

        <aside className="card">
          <CardHeader title="Job description" subtitle={`${drive.roleTitle} · ${drive.companyName}`} dense />
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
        </aside>
      </div>
    </div>
  );
}
