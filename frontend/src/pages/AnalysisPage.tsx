import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import ResumeFixView from "../components/ResumeFixView";
import PdfResumeFixView from "../components/PdfResumeFixView";
import StepLoader from "../components/StepLoader";
import type { FixSuggestionRecord, ParsedResume } from "../types/resume";

interface ResumeRecord {
  id: string;
  filename: string;
  uploadedAt: string;
  status: "pending" | "processing" | "ready" | "failed";
  processingError: string | null;
  parsed: ParsedResume | null;
}

interface AnalysisRecord {
  detectedField: string;
  secondaryFields: string[];
  seniority: string;
  confidence: number;
  reasoning: string;
}

interface AtsScoreRecord {
  totalScore: number;
  formattingScore: number;
  keywordScore: number;
  impactScore: number;
  structureScore: number;
  breakdown: {
    matchedKeywords: string[];
    missingKeywords: string[];
    impactReasoning: string;
  };
}

interface PlagiarismRecord {
  checked: boolean;
  similarityPercent: number | null;
  flagged: boolean;
}

const MAX_SCORES = {
  formatting: 20,
  keyword: 30,
  impact: 25,
  structure: 25,
};

function barColor(percent: number) {
  if (percent >= 75) return "bg-lime";
  if (percent >= 50) return "bg-amber";
  return "bg-coral";
}

interface ScoreBarProps {
  label: string;
  score: number;
  max: number;
}

function ScoreBar({ label, score, max }: ScoreBarProps) {
  const percent = Math.round((score / max) * 100);
  return (
    <div className="flex items-center gap-3 mb-3.5">
      <span className="w-[110px] text-xs text-text-2">{label}</span>
      <div className="flex-1 h-1.5 rounded bg-card-2 overflow-hidden">
        <div
          className={`h-full ${barColor(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-[40px] text-right font-mono text-xs">
        {score}/{max}
      </span>
    </div>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const angle = 180 - (clamped / 100) * 180;
  const radians = (angle * Math.PI) / 180;
  const x = 70 + 60 * Math.cos(radians);
  const y = 80 - 60 * Math.sin(radians);

  return (
    <div className="flex flex-col items-center py-5">
      <svg width="140" height="90" viewBox="0 0 140 90">
        <path
          d="M10 80 A60 60 0 0 1 130 80"
          fill="none"
          stroke="#D8D0C5"
          strokeWidth="10"
        />
        <path
          d={`M10 80 A60 60 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`}
          fill="none"
          stroke="#14294F"
          strokeWidth="10"
          strokeLinecap="round"
        />
      </svg>
      <div className="font-display font-bold text-[52px] -mt-[72px]">
        {score}
      </div>
      <div className="text-xs text-text-2">ATS score / 100</div>
    </div>
  );
}

const ANALYZING_STEPS = [
  "Extracting your resume content…",
  "Detecting your field and seniority…",
  "Computing your ATS score…",
];

const FIX_SUGGESTION_STEPS = [
  "Reading your resume bullets…",
  "Rewriting weak phrasing…",
  "Finalizing suggestions…",
];

const SKILL_TEST_STEPS = [
  "Selecting test topics…",
  "Writing your questions…",
  "Assembling your test…",
];

export default function AnalysisPage() {
  const { resumeId } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState<ResumeRecord | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [atsScore, setAtsScore] = useState<AtsScoreRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [fixSuggestions, setFixSuggestions] = useState<
    FixSuggestionRecord[] | null
  >(null);
  const [plagiarism, setPlagiarism] = useState<PlagiarismRecord | null>(null);
  const [isGeneratingFixes, setIsGeneratingFixes] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);
  const [pdfRenderFailed, setPdfRenderFailed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleGenerateTest() {
    setTestError(null);
    setIsGeneratingTest(true);
    try {
      const { data } = await api.post<{ testId: string }>(
        `/api/resumes/${resumeId}/generate-test`
      );
      navigate(`/tests/${data.testId}`);
    } catch (err) {
      setTestError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't generate a test right now."
      );
    } finally {
      setIsGeneratingTest(false);
    }
  }

  async function handleStartInterview() {
    setInterviewError(null);
    setIsStartingInterview(true);
    try {
      const { data } = await api.post<{ interviewId: string }>(
        `/api/resumes/${resumeId}/start-interview`
      );
      navigate(`/interviews/${data.interviewId}`);
    } catch (err) {
      setInterviewError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't start an interview right now."
      );
    } finally {
      setIsStartingInterview(false);
    }
  }

  async function handleGenerateFixes() {
    setFixError(null);
    setIsGeneratingFixes(true);
    try {
      const { data } = await api.post<{ suggestions: FixSuggestionRecord[] }>(
        `/api/resumes/${resumeId}/fix-suggestions`
      );
      setFixSuggestions(data.suggestions);
    } catch (err) {
      setFixError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't generate fix suggestions right now."
      );
    } finally {
      setIsGeneratingFixes(false);
    }
  }

  async function handleRetry() {
    setRetryError(null);
    setIsRetrying(true);
    try {
      await api.post(`/api/resumes/${resumeId}/retry`);
      setResume(null);
      setIsLoading(true);
      setRetryNonce((n) => n + 1); // restarts polling below
    } catch (err) {
      setRetryError(
        axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : "Couldn't restart the analysis. Try re-uploading."
      );
    } finally {
      setIsRetrying(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const { data } = await api.get<ResumeRecord>(`/api/resumes/${resumeId}`);
        if (cancelled) return;
        setResume(data);
        setIsLoading(false);

        if (data.status === "ready") {
          const [analysisRes, scoreRes, fixesRes, plagiarismRes] = await Promise.all([
            api.get<AnalysisRecord>(`/api/resumes/${resumeId}/analysis`),
            api.get<AtsScoreRecord>(`/api/resumes/${resumeId}/ats-score`),
            api.get<{ suggestions: FixSuggestionRecord[] }>(
              `/api/resumes/${resumeId}/fix-suggestions`
            ),
            api.get<PlagiarismRecord>(`/api/resumes/${resumeId}/plagiarism`),
          ]);
          if (cancelled) return;
          setAnalysis(analysisRes.data);
          setAtsScore(scoreRes.data);
          if (fixesRes.data.suggestions.length > 0) {
            setFixSuggestions(fixesRes.data.suggestions);
          }
          setPlagiarism(plagiarismRes.data);
          return;
        }

        if (data.status === "failed") return;

        pollTimer.current = setTimeout(poll, 3000);
      } catch (err) {
        if (cancelled) return;
        setIsLoading(false);
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "Resume not found."
            : "Couldn't load this resume."
        );
      }
    }

    setIsLoading(true);
    setError(null);
    poll();

    return () => {
      cancelled = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [resumeId, retryNonce]);

  if (isLoading) {
    return (
      <div className="pt-10">
        <p className="text-text-2 text-sm">Loading resume…</p>
      </div>
    );
  }

  if (error || !resume) {
    return (
      <div className="pt-10">
        <p className="text-coral text-sm" role="alert">
          {error ?? "Resume not found."}
        </p>
      </div>
    );
  }

  const header = (
    <div className="flex justify-end items-center pb-7 border-b border-border mb-10">
      <div className="text-xs text-text-2">
        {resume.filename} ·{" "}
        <Link to="/" className="text-lime-ink">
          Re-upload
        </Link>
      </div>
    </div>
  );

  if (resume.status === "failed") {
    return (
      <div className="pt-10">
        {header}
        <div className="card">
          <p className="text-coral text-sm" role="alert">
            Analysis failed: {resume.processingError ?? "Unknown error"}
          </p>
          <p className="text-text-2 text-sm mt-3">
            This is usually temporary (for example, the AI service was busy). Your file is
            saved — you don't need to upload it again.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn btn-primary btn-small disabled:opacity-60"
              onClick={() => void handleRetry()}
              disabled={isRetrying}
            >
              {isRetrying ? "Restarting…" : "Try again"}
            </button>
            {retryError && (
              <span className="text-coral text-sm" role="alert">
                {retryError}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (resume.status !== "ready" || !analysis || !atsScore) {
    return (
      <div className="pt-10">
        {header}
        <div className="card">
          <p className="text-text-2 text-sm mb-6">
            Analyzing your resume. This runs on a local model and can take a
            minute or two…
          </p>
          <StepLoader steps={ANALYZING_STEPS} stepDurationMs={18000} />
        </div>
      </div>
    );
  }

  const skills = resume.parsed?.skills ?? [];

  return (
    <div className="pt-10">
      {header}

      <div className="flex gap-5 mb-5">
        <div className="flex-1 card">
          <p className="eyebrow">Detected field</p>
          <h2 className="text-[26px] font-display font-medium mb-0">
            {analysis.detectedField}
          </h2>
          <p className="text-text-2 text-[13px] my-1.5 mb-4">
            Confidence {Math.round(analysis.confidence)}% · {analysis.seniority}
          </p>
          <div>
            {skills.length > 0 ? (
              skills.map((skill) => (
                <span className="tag" key={skill}>
                  {skill}
                </span>
              ))
            ) : (
              <span className="text-text-3 text-xs">No skills detected</span>
            )}
          </div>
        </div>
        <div className="flex-none w-[260px] card">
          <ScoreGauge score={atsScore.totalScore} />
          {plagiarism?.checked && plagiarism.similarityPercent !== null && (
            <div className="border-t border-border pt-3 mt-1 text-center">
              <div className="text-xs text-text-2">
                Similarity to other resumes
              </div>
              <div
                className={`font-mono text-sm mt-0.5 ${
                  plagiarism.flagged
                    ? "text-coral"
                    : plagiarism.similarityPercent >= 50
                    ? "text-amber"
                    : "text-teal"
                }`}
              >
                {plagiarism.similarityPercent}%
              </div>
              {plagiarism.flagged && (
                <p className="text-coral text-xs mt-1.5">
                  This closely resembles another resume on file.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-5">
        <h2 className="mb-[18px]">Score breakdown</h2>
        <ScoreBar
          label="Formatting"
          score={atsScore.formattingScore}
          max={MAX_SCORES.formatting}
        />
        <ScoreBar
          label="Keyword match"
          score={atsScore.keywordScore}
          max={MAX_SCORES.keyword}
        />
        <ScoreBar
          label="Impact/clarity"
          score={atsScore.impactScore}
          max={MAX_SCORES.impact}
        />
        <ScoreBar
          label="Structure"
          score={atsScore.structureScore}
          max={MAX_SCORES.structure}
        />
        {atsScore.breakdown.missingKeywords.length > 0 && (
          <p className="text-text-2 text-xs mt-3">
            Missing keywords for {analysis.detectedField}:{" "}
            {atsScore.breakdown.missingKeywords.join(", ")}
          </p>
        )}
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2>Fix suggestions</h2>
          <button
            type="button"
            className="btn btn-small btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isGeneratingFixes}
            onClick={handleGenerateFixes}
          >
            {isGeneratingFixes ? "Generating…" : "Generate fixes"}
          </button>
        </div>

        {fixError && (
          <p className="text-coral text-xs mb-3" role="alert">
            {fixError}
          </p>
        )}

        {fixSuggestions === null && !isGeneratingFixes && (
          <p className="text-text-2 text-sm">
            Click "Generate fixes" for section-by-section before/after
            rewrites of weak bullet points.
          </p>
        )}

        {isGeneratingFixes && (
          <StepLoader steps={FIX_SUGGESTION_STEPS} stepDurationMs={7000} />
        )}

        {fixSuggestions !== null && fixSuggestions.length === 0 && (
          <p className="text-text-2 text-sm">
            No suggestions — your experience bullets already read as strong
            and specific.
          </p>
        )}

        {fixSuggestions !== null &&
          fixSuggestions.length > 0 &&
          resume.parsed &&
          (resume.filename.toLowerCase().endsWith(".pdf") &&
          !pdfRenderFailed ? (
            <PdfResumeFixView
              fileUrl={`${api.defaults.baseURL}/api/resumes/${resumeId}/file`}
              suggestions={fixSuggestions}
              onRenderFailed={() => setPdfRenderFailed(true)}
            />
          ) : (
            <ResumeFixView resume={resume.parsed} suggestions={fixSuggestions} />
          ))}

        {testError && (
          <p className="text-coral text-xs mt-3" role="alert">
            {testError}
          </p>
        )}
        {interviewError && (
          <p className="text-coral text-xs mt-3" role="alert">
            {interviewError}
          </p>
        )}
        {isGeneratingTest && (
          <div className="mt-[18px]">
            <StepLoader steps={SKILL_TEST_STEPS} stepDurationMs={6000} />
          </div>
        )}
        <div className="flex justify-end gap-3 mt-[18px]">
          <button
            type="button"
            className="btn disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isStartingInterview}
            onClick={handleStartInterview}
          >
            {isStartingInterview ? "Starting…" : "Start AI interview"}
          </button>
          <button
            type="button"
            className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isGeneratingTest}
            onClick={handleGenerateTest}
          >
            {isGeneratingTest ? "Generating…" : "Generate skill test →"}
          </button>
        </div>
      </div>
    </div>
  );
}
