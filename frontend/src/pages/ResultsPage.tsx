import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";
import PlatformIcon from "../components/PlatformIcon";
import RecommendedCourses from "../components/courses/RecommendedCourses";
import { buildCourseResources } from "../lib/courseResources";
import { generateResultsPdf } from "../lib/generateResultsPdf";
import type { ReferenceSolution } from "../lib/generateResultsPdf";

interface TopicStat {
  correct: number;
  total: number;
}

interface CodingResult {
  title?: string;
  topic?: string;
  difficulty?: "easy" | "medium" | "hard";
  passed: number;
  total: number;
  error: string | null;
}

const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-teal/10 text-teal",
  medium: "bg-amber/10 text-amber",
  hard: "bg-coral/10 text-coral",
};

interface McqBreakdownEntry {
  id: string;
  type: "mcq";
  topic: string;
  question: string;
  options: string[];
  userAnswerIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
}

interface CodingBreakdownEntry {
  id: string;
  type: "coding";
  topic: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  problemStatement: string;
  language: string | null;
  userCode: string | null;
  passed: number;
  total: number;
  error: string | null;
  isCorrect: boolean;
}

type QuestionBreakdownEntry = McqBreakdownEntry | CodingBreakdownEntry;

interface ResultsRecord {
  attemptId: string;
  score: number;
  topicBreakdown: Record<string, TopicStat>;
  startedAt: string;
  completedAt: string;
  codingResults: Record<string, CodingResult>;
  questionBreakdown: QuestionBreakdownEntry[];
}

function severity(correct: number, total: number): {
  label: string;
  className: string;
} {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.75) return { label: "Strong", className: "sev-strong" };
  if (ratio >= 0.4) return { label: "Fair", className: "sev-mid" };
  return { label: "Weak", className: "sev-weak" };
}

function formatDuration(startedAt: string, completedAt: string): string {
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds.toString().padStart(2, "0")}s`;
}

export default function ResultsPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [solutions, setSolutions] = useState<Record<string, ReferenceSolution>>({});
  const [loadingSolutionIds, setLoadingSolutionIds] = useState<Set<string>>(new Set());
  const [expandedSolutionIds, setExpandedSolutionIds] = useState<Set<string>>(new Set());
  const [solutionErrors, setSolutionErrors] = useState<Record<string, string>>({});
  const [isPreparingReport, setIsPreparingReport] = useState(false);
  const [isRetaking, setIsRetaking] = useState(false);
  const [retakeError, setRetakeError] = useState<string | null>(null);

  async function fetchSolution(
    questionId: string,
    language: string
  ): Promise<ReferenceSolution> {
    const { data } = await api.get<ReferenceSolution>(
      `/api/tests/${testId}/questions/${questionId}/solution`,
      { params: { language } }
    );
    setSolutions((prev) => ({ ...prev, [questionId]: data }));
    return data;
  }

  async function handleToggleSolution(questionId: string, language: string) {
    setExpandedSolutionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
    if (solutions[questionId]) return;

    setSolutionErrors((prev) => {
      const { [questionId]: _omit, ...rest } = prev;
      return rest;
    });
    setLoadingSolutionIds((prev) => new Set(prev).add(questionId));
    try {
      await fetchSolution(questionId, language);
    } catch {
      setSolutionErrors((prev) => ({
        ...prev,
        [questionId]: "Couldn't generate a solution right now.",
      }));
    } finally {
      setLoadingSolutionIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    }
  }

  async function handleDownloadReport() {
    if (!results) return;
    setIsPreparingReport(true);
    try {
      const merged = { ...solutions };
      const codingQuestions = results.questionBreakdown.filter(
        (q): q is CodingBreakdownEntry => q.type === "coding"
      );
      await Promise.all(
        codingQuestions.map(async (q) => {
          if (merged[q.id]) return;
          try {
            merged[q.id] = await fetchSolution(q.id, q.language ?? "javascript");
          } catch {
            // Omit this question's solution from the report if generation fails.
          }
        })
      );
      generateResultsPdf(results, merged);
    } finally {
      setIsPreparingReport(false);
    }
  }

  async function handleRetake() {
    const confirmed = window.confirm(
      "Start a new attempt? Your current results stay saved, but this results page will switch to showing the new attempt once you submit it."
    );
    if (!confirmed) return;
    setRetakeError(null);
    setIsRetaking(true);
    try {
      await api.post(`/api/tests/${testId}/retake`);
      navigate(`/tests/${testId}`);
    } catch {
      setRetakeError("Couldn't start a new attempt right now.");
      setIsRetaking(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api
      .get<ResultsRecord>(`/api/tests/${testId}/results`)
      .then(({ data }) => {
        if (!cancelled) setResults(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "No completed attempt for this test yet."
            : "Couldn't load results."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [testId]);

  if (isLoading) {
    return (
      <div className="pt-10">
        <p className="text-text-2 text-sm">Loading results…</p>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="pt-10">
        <p className="text-coral text-sm" role="alert">
          {error ?? "Results not found."}
        </p>
      </div>
    );
  }

  const totalCorrect = Object.values(results.topicBreakdown).reduce(
    (sum, t) => sum + t.correct,
    0
  );
  const totalQuestions = Object.values(results.topicBreakdown).reduce(
    (sum, t) => sum + t.total,
    0
  );
  const weakTopics = Object.entries(results.topicBreakdown).filter(
    ([, stat]) => severity(stat.correct, stat.total).label === "Weak"
  );

  return (
    <div className="pt-10">
      <div className="flex gap-5 mb-5">
        <div className="flex-1 card">
          <p className="eyebrow">Test complete</p>
          <h1 className="text-[44px] font-display font-bold">
            {results.score.toFixed(1)}
            <span className="text-xl text-text-3">/10</span>
          </h1>
          <p className="text-text-2 text-[15px]">
            {totalCorrect} of {totalQuestions} questions correct.
          </p>
        </div>
        <div className="flex-none w-[220px] card">
          <p className="eyebrow">Time taken</p>
          <h2 className="text-[22px]">
            {formatDuration(results.startedAt, results.completedAt)}
          </h2>
          <p className="text-text-2 text-xs">of 30 min limit</p>
        </div>
      </div>

      <div className="card mb-5">
        <h2 className="mb-1.5">Weak areas</h2>
        <p className="text-text-2 text-xs mb-3.5">
          Courses to close these gaps are below. Courses you start, and ones your
          faculty assigns, show up in{" "}
          <Link to="/assignments" className="underline">
            My assignments
          </Link>
          .
        </p>
        {weakTopics.length === 0 ? (
          <p className="text-text-2 text-sm py-2">
            No weak topics — you scored solidly everywhere.
          </p>
        ) : (
          weakTopics.map(([topic, stat]) => {
            const correctDisplay = Number.isInteger(stat.correct)
              ? stat.correct
              : stat.correct.toFixed(1);
            return (
              <div
                key={topic}
                className="flex items-center justify-between gap-4 py-3.5 border-b border-border last:border-b-0"
              >
                <div>
                  <span>{topic}</span>
                  <span className="font-mono text-[11px] px-2.5 py-1 ml-2 rounded-full bg-red/10 text-red">
                    {correctDisplay}/{stat.total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {buildCourseResources(topic).map((resource) => (
                    <a
                      key={resource.platform}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      title={`Search on ${resource.platform}`}
                      className="hover:opacity-80 hover:scale-105 transition-transform"
                    >
                      <PlatformIcon platform={resource.platform} />
                    </a>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {testId && <RecommendedCourses testId={testId} />}

      {results.questionBreakdown.length > 0 && (
        <div className="card mb-5">
          <h2 className="mb-1.5">Question review</h2>
          <p className="text-text-2 text-xs mb-3.5">
            Every question you were asked, what you answered, and the correct
            solution.
          </p>
          {results.questionBreakdown.map((q, index) => (
            <div
              key={q.id}
              className="py-3.5 border-b border-border last:border-b-0"
            >
              {q.type === "mcq" ? (
                <>
                  <div className="flex justify-between items-start gap-3">
                    <p className="text-[15px] flex-1">
                      {index + 1}. {q.question}
                    </p>
                    <span
                      className={`font-mono text-[11px] px-2.5 py-1 rounded-full shrink-0 ${
                        q.isCorrect
                          ? "bg-teal/10 text-teal"
                          : "bg-red/10 text-red"
                      }`}
                    >
                      {q.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {q.options.map((opt, i) => {
                      const isCorrectOpt = i === q.correctIndex;
                      const isUserOpt = i === q.userAnswerIndex;
                      return (
                        <p
                          key={i}
                          className={`text-[13px] ${
                            isCorrectOpt
                              ? "text-teal font-medium"
                              : isUserOpt
                              ? "text-red"
                              : "text-text-2"
                          }`}
                        >
                          {isCorrectOpt ? "✓ " : isUserOpt ? "✗ " : "  "}
                          {opt}
                          {isUserOpt && !isCorrectOpt && (
                            <span className="text-text-3"> (your answer)</span>
                          )}
                        </p>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="flex items-center gap-2">
                      {index + 1}. {q.title}
                      <span
                        className={`font-mono text-[10px] px-2 py-0.5 rounded-full uppercase ${DIFFICULTY_STYLES[q.difficulty]}`}
                      >
                        {q.difficulty}
                      </span>
                    </span>
                    <span
                      className={`font-mono text-[11px] px-2.5 py-1 rounded-full ${
                        q.isCorrect
                          ? "bg-teal/10 text-teal"
                          : "bg-red/10 text-red"
                      }`}
                    >
                      {q.passed}/{q.total} tests passed
                    </span>
                  </div>
                  {q.error && (
                    <p className="font-mono text-[11px] text-coral mt-1.5 whitespace-pre-wrap">
                      {q.error}
                    </p>
                  )}
                  <button
                    type="button"
                    className="text-xs text-lime-ink mt-2 underline disabled:opacity-60"
                    disabled={loadingSolutionIds.has(q.id)}
                    onClick={() =>
                      handleToggleSolution(q.id, q.language ?? "javascript")
                    }
                  >
                    {loadingSolutionIds.has(q.id)
                      ? "Generating solution…"
                      : expandedSolutionIds.has(q.id)
                      ? "Hide reference solution"
                      : "Show reference solution"}
                  </button>
                  {solutionErrors[q.id] && (
                    <p className="text-coral text-xs mt-1.5">
                      {solutionErrors[q.id]}
                    </p>
                  )}
                  {expandedSolutionIds.has(q.id) && solutions[q.id] && (
                    <div className="mt-2">
                      <p className="text-text-2 text-[13px] mb-1.5">
                        {solutions[q.id].explanation}
                      </p>
                      <pre className="font-mono text-[11px] bg-card-2 border border-border rounded-md p-3 overflow-x-auto whitespace-pre-wrap">
                        {solutions[q.id].code}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {retakeError && (
        <p className="text-coral text-xs mt-3 text-right" role="alert">
          {retakeError}
        </p>
      )}
      <div className="flex justify-end gap-3 mt-5">
        <button
          type="button"
          className="btn disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isRetaking}
          onClick={handleRetake}
        >
          {isRetaking ? "Starting…" : "Retake test"}
        </button>
        <button
          type="button"
          className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={isPreparingReport}
          onClick={handleDownloadReport}
        >
          {isPreparingReport ? "Preparing report…" : "Download report"}
        </button>
      </div>
    </div>
  );
}
