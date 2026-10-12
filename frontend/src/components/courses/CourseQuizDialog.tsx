import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { errorMessage } from "../faculty/types";
import { CheckIcon } from "../faculty/icons";

interface QuizPayload {
  quizId: string;
  stage: number;
  label: string;
  passPercent: number;
  progressOnPass: number;
  questions: { question: string; options: string[] }[];
}

export interface QuizResult {
  score: number;
  passed: boolean;
  passPercent: number;
  progressPercent: number;
  status: "assigned" | "in_progress" | "completed";
  retryAt: string | null;
  review: { chosenIndex: number; correctIndex: number; explanation: string }[];
}

/** Full-screen quiz for one course. Loads (or resumes) the quiz for the
 * course's next stage, collects one answer per question, and shows the
 * graded review. Progress only changes on the server, from the grade. */
export default function CourseQuizDialog({
  assignmentId,
  courseTitle,
  onClose,
  onGraded,
}: {
  assignmentId: string;
  courseTitle: string;
  onClose: () => void;
  onGraded: (result: QuizResult) => void;
}) {
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .post<QuizPayload>(`/api/assignments/${assignmentId}/quiz`)
      .then(({ data }) => {
        if (cancelled) return;
        setQuiz(data);
        setAnswers(data.questions.map(() => null));
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, "Couldn't load the quiz."));
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSubmitting, onClose]);

  const answeredCount = answers.filter((a) => a !== null).length;

  async function submit() {
    if (!quiz || answers.some((a) => a === null)) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post<QuizResult>(
        `/api/assignments/quizzes/${quiz.quizId}/submit`,
        { answers }
      );
      setResult(data);
      onGraded(data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't submit the quiz."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/95 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={quiz ? `${quiz.label}: ${courseTitle}` : "Course quiz"}
    >
      <div className="max-w-[720px] mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="eyebrow">{quiz?.label ?? "Course quiz"}</p>
            <h2 className="text-[20px] leading-snug break-words">{courseTitle}</h2>
            {quiz && !result && (
              <p className="text-text-2 text-[13px] mt-1">
                Score {quiz.passPercent}% or more to move this course to{" "}
                {quiz.progressOnPass}%.
              </p>
            )}
          </div>
          <button
            type="button"
            className="btn btn-small flex-none"
            onClick={onClose}
            disabled={isSubmitting}
          >
            {result ? "Done" : "Close"}
          </button>
        </div>

        {error && (
          <div role="alert" className="card border-coral/30 bg-coral/5 text-coral text-sm mb-4">
            {error}
          </div>
        )}

        {!quiz && !error && (
          <div className="card text-center py-10" aria-busy="true">
            <span
              className="inline-block w-7 h-7 rounded-full border-[3px] border-lime/25 border-t-lime animate-spin mb-3"
              aria-hidden="true"
            />
            <p className="text-text-2 text-sm">Writing your quiz on this course…</p>
          </div>
        )}

        {result && (
          <div
            role="status"
            className={`card mb-5 ${
              result.passed ? "border-teal/40 bg-teal/5" : "border-coral/30 bg-coral/5"
            }`}
          >
            <p className={`text-[17px] font-semibold ${result.passed ? "text-teal" : "text-coral"}`}>
              {result.passed ? "Passed" : "Not passed yet"}: {result.score}%
            </p>
            <p className="text-text-2 text-sm mt-1">
              {result.passed
                ? result.progressPercent >= 100
                  ? "Course complete. It's now at 100%."
                  : `Your course is now at ${result.progressPercent}%. Finish the rest of the course, then take the final quiz.`
                : `You needed ${result.passPercent}%. Review the answers below and the course material, then try a new quiz${
                    result.retryAt
                      ? ` after ${new Date(result.retryAt).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}`
                      : ""
                  }.`}
            </p>
          </div>
        )}

        {quiz && (
          <ol className="flex flex-col gap-4">
            {quiz.questions.map((q, qi) => {
              const review = result?.review[qi];
              return (
                <li key={qi} className="card !p-4 sm:!p-5">
                  <p className="font-semibold text-[15px] leading-snug mb-3">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oi) => {
                      const chosen = answers[qi] === oi;
                      const isCorrect = review && oi === review.correctIndex;
                      const isWrongPick = review && chosen && oi !== review.correctIndex;
                      return (
                        <button
                          key={oi}
                          type="button"
                          disabled={!!result || isSubmitting}
                          aria-pressed={chosen}
                          onClick={() =>
                            setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))
                          }
                          className={`text-left rounded-xl border-2 px-3.5 py-2.5 text-sm transition ${
                            isCorrect
                              ? "border-teal bg-teal/10"
                              : isWrongPick
                              ? "border-coral bg-coral/10"
                              : chosen
                              ? "border-lime bg-lime/10"
                              : "border-border bg-white hover:border-lime"
                          } disabled:cursor-default`}
                        >
                          <span className="inline-flex items-start gap-2">
                            <span className="font-mono text-text-3">{String.fromCharCode(65 + oi)}.</span>
                            <span className="break-words">{opt}</span>
                            {isCorrect && (
                              <CheckIcon width={14} height={14} strokeWidth={3} className="flex-none mt-0.5 text-teal" />
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {review?.explanation && (
                    <p className="text-text-2 text-[13px] mt-2.5">{review.explanation}</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {quiz && !result && (
          <div className="sticky bottom-0 mt-5 py-3 bg-bg/95 flex items-center justify-between gap-3">
            <span className="text-text-2 text-sm">
              {answeredCount} of {quiz.questions.length} answered
            </span>
            <button
              type="button"
              className="btn btn-primary disabled:opacity-60"
              disabled={isSubmitting || answeredCount < quiz.questions.length}
              onClick={() => void submit()}
            >
              {isSubmitting ? "Grading…" : "Submit quiz"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
