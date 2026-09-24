import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { api } from "../lib/api";

type CodingLanguage = "javascript" | "python" | "c" | "cpp";
type CodingDifficulty = "easy" | "medium" | "hard";

interface McqQuestion {
  id: string;
  type: "mcq";
  field: string;
  topic: string;
  question: string;
  options: string[];
}

interface CodingQuestion {
  id: string;
  type: "coding";
  field: string;
  topic: string;
  title: string;
  difficulty: CodingDifficulty;
  problemStatement: string;
  functionName: string;
  starterCode: Partial<Record<CodingLanguage, string>>;
  testCaseCount: number;
}

type AnyQuestion = McqQuestion | CodingQuestion;

interface TestRecord {
  testId: string;
  resumeId: string;
  questions: AnyQuestion[];
}

type Phase = "setup" | "active" | "submitting";

const TIME_LIMIT_SECONDS = 30 * 60;
const MAX_VIOLATIONS_BEFORE_AUTO_SUBMIT = 2;
const VIOLATION_DEBOUNCE_MS = 1500;
const PROCTOR_CHECK_INTERVAL_MS = 6000;
const LANGUAGE_LABELS: Record<CodingLanguage, string> = {
  javascript: "JavaScript",
  python: "Python",
  c: "C",
  cpp: "C++",
};
const DIFFICULTY_STYLES: Record<CodingDifficulty, string> = {
  easy: "bg-teal/10 text-teal",
  medium: "bg-amber/10 text-amber",
  hard: "bg-coral/10 text-coral",
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export default function TestPage() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState<TestRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [codeByQuestion, setCodeByQuestion] = useState<
    Record<string, Partial<Record<CodingLanguage, string>>>
  >({});
  const [selectedLanguage, setSelectedLanguage] = useState<
    Record<string, CodingLanguage>
  >({});
  const [secondsLeft, setSecondsLeft] = useState(TIME_LIMIT_SECONDS);
  const submittedRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("setup");
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isRequestingStart, setIsRequestingStart] = useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [violationReason, setViolationReason] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const lastViolationTimeRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api
      .get<TestRecord>(`/api/tests/${testId}`)
      .then(({ data }) => {
        if (!cancelled) setTest(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          axios.isAxiosError(err) && err.response?.status === 404
            ? "Test not found."
            : "Couldn't load this test."
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [testId]);

  const topics = useMemo(() => {
    if (!test) return [];
    return Array.from(new Set(test.questions.map((q) => q.topic)));
  }, [test]);

  const currentQuestion = test?.questions[currentIndex] ?? null;

  // Seed each coding question's editor with its starter code the first
  // time it's viewed, defaulting to whichever language the question offers.
  useEffect(() => {
    if (!currentQuestion || currentQuestion.type !== "coding") return;
    const languages = Object.keys(
      currentQuestion.starterCode
    ) as CodingLanguage[];
    if (languages.length === 0) return;
    const defaultLang = languages[0];

    setSelectedLanguage((prev) =>
      prev[currentQuestion.id] ? prev : { ...prev, [currentQuestion.id]: defaultLang }
    );
    setCodeByQuestion((prev) => {
      if (prev[currentQuestion.id]) return prev;
      return {
        ...prev,
        [currentQuestion.id]: {
          [defaultLang]: currentQuestion.starterCode[defaultLang] ?? "",
        },
      };
    });
  }, [currentQuestion]);

  function handleLanguageChange(question: CodingQuestion, lang: CodingLanguage) {
    setSelectedLanguage((prev) => ({ ...prev, [question.id]: lang }));
    setCodeByQuestion((prev) => {
      const existing = prev[question.id] ?? {};
      if (existing[lang] !== undefined) return prev;
      return {
        ...prev,
        [question.id]: { ...existing, [lang]: question.starterCode[lang] ?? "" },
      };
    });
  }

  function handleCodeChange(questionId: string, lang: CodingLanguage, code: string) {
    setCodeByQuestion((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? {}), [lang]: code },
    }));
  }

  function stopMedia() {
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    mediaStreamRef.current = null;
  }

  function exitFullscreenIfActive() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  const handleSubmit = useMemo(
    () => async () => {
      if (!test || submittedRef.current) return;
      submittedRef.current = true;
      setIsSubmitting(true);
      setPhase("submitting");

      const codeSubmissions: Record<
        string,
        { language: CodingLanguage; code: string }
      > = {};
      for (const q of test.questions) {
        if (q.type !== "coding") continue;
        const lang = selectedLanguage[q.id];
        const code = lang ? codeByQuestion[q.id]?.[lang] : undefined;
        if (lang && code !== undefined) {
          codeSubmissions[q.id] = { language: lang, code };
        }
      }

      try {
        await api.post(`/api/tests/${testId}/submit`, {
          answers,
          codeSubmissions,
        });
        stopMedia();
        exitFullscreenIfActive();
        navigate(`/tests/${testId}/results`);
      } catch {
        submittedRef.current = false;
        setIsSubmitting(false);
        setPhase("active");
        setError("Couldn't submit your answers. Please try again.");
      }
    },
    [test, testId, answers, codeByQuestion, selectedLanguage, navigate]
  );

  // Shared by every violation source (fullscreen exit, tab/window blur, and
  // the webcam proctoring checks below): warn once, auto-submit on a second
  // violation.
  const triggerViolation = useMemo(
    () => (reason: string) => {
      const now = Date.now();
      if (now - lastViolationTimeRef.current < VIOLATION_DEBOUNCE_MS) return;
      lastViolationTimeRef.current = now;
      setViolationReason(reason);

      setViolationCount((prev) => {
        const next = prev + 1;
        if (next >= MAX_VIOLATIONS_BEFORE_AUTO_SUBMIT) {
          handleSubmit();
        } else {
          setIsPaused(true);
          setShowWarning(true);
        }
        return next;
      });
    },
    [handleSubmit]
  );

  // Fullscreen exit and tab/window blur are both signals the candidate left
  // the test. Neither can actually be blocked by a web page (Escape-to-exit
  // and OS-level Alt+Tab are enforced by the browser itself) so this is
  // detect-and-respond: warn once, auto-submit on a second violation.
  useEffect(() => {
    if (phase !== "active") return;

    function onFullscreenChange() {
      if (!document.fullscreenElement) {
        triggerViolation("You exited fullscreen mode.");
      }
    }
    function onVisibilityChange() {
      if (document.hidden) {
        triggerViolation("You switched to another tab or window.");
      }
    }
    function onBlur() {
      triggerViolation("The test window lost focus.");
    }

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
    };
  }, [phase, triggerViolation]);

  // Webcam proctoring: periodically capture a frame and ask a vision model
  // whether a phone or an extra person is visible, routing any hit through
  // the same violation pipeline as the fullscreen/tab-switch checks above.
  useEffect(() => {
    if (phase !== "active" || isPaused) return;

    const interval = setInterval(async () => {
      const video = videoPreviewRef.current;
      if (!video || video.readyState < 2) return;

      // Downscale before sending: the vision model's latency scales with
      // image size, and a phone/extra person is easily identifiable well
      // below native webcam resolution, so this is the single biggest lever
      // for making each check fast.
      const PROCTOR_FRAME_MAX_DIMENSION = 480;
      const scale = Math.min(
        1,
        PROCTOR_FRAME_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight)
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.7);

      try {
        const { data } = await api.post<{
          phoneDetected: boolean;
          personCount: number;
        }>(`/api/tests/${testId}/proctor-check`, { image });

        if (data.phoneDetected) {
          triggerViolation("A phone was detected in your webcam.");
        } else if (data.personCount > 1) {
          triggerViolation("Multiple people were detected in your webcam.");
        }
      } catch {
        // A flaky proctoring check shouldn't interrupt the test.
      }
    }, PROCTOR_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [phase, isPaused, testId, triggerViolation]);

  useEffect(() => {
    if (phase !== "active" || isPaused) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, isPaused, secondsLeft, handleSubmit]);

  useEffect(() => {
    if (videoPreviewRef.current && mediaStreamRef.current) {
      videoPreviewRef.current.srcObject = mediaStreamRef.current;
    }
  }, [phase]);

  useEffect(() => {
    return () => {
      stopMedia();
      exitFullscreenIfActive();
    };
  }, []);

  async function handleStartTest() {
    setPermissionError(null);
    setIsRequestingStart(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      mediaStreamRef.current = stream;

      await document.documentElement.requestFullscreen();

      setPhase("active");
    } catch {
      setPermissionError(
        "Camera, microphone, and fullscreen access are all required to start this test. Please allow them and try again."
      );
      stopMedia();
    } finally {
      setIsRequestingStart(false);
    }
  }

  async function handleResumeAfterWarning() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      setShowWarning(false);
      setIsPaused(false);
    } catch {
      // Stay paused with the warning up until fullscreen is actually granted again.
    }
  }

  function handleCodeTab(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    questionId: string,
    lang: CodingLanguage
  ) {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const target = e.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const newValue = `${target.value.slice(0, start)}  ${target.value.slice(end)}`;
    handleCodeChange(questionId, lang, newValue);
    requestAnimationFrame(() => {
      target.selectionStart = target.selectionEnd = start + 2;
    });
  }

  if (isLoading) {
    return (
      <div className="pt-10">
        <p className="text-text-2 text-sm">Loading test…</p>
      </div>
    );
  }

  if (error || !test || !currentQuestion) {
    return (
      <div className="pt-10">
        <p className="text-coral text-sm" role="alert">
          {error ?? "This test has no questions."}
        </p>
      </div>
    );
  }

  if (phase === "setup") {
    return (
      <div className="pt-10">
        <div className="card max-w-[520px] mx-auto text-center">
          <p className="eyebrow">Before you begin</p>
          <h1 className="text-xl mb-4">Proctored test setup</h1>
          <p className="text-text-2 text-sm mb-5 leading-relaxed">
            This test runs in fullscreen with camera and microphone access
            required. Leaving fullscreen or switching to another window will
            trigger a warning — a second violation auto-submits the test
            immediately.
          </p>
          {permissionError && (
            <p className="text-coral text-sm mb-4" role="alert">
              {permissionError}
            </p>
          )}
          <button
            type="button"
            className="btn btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isRequestingStart}
            onClick={handleStartTest}
          >
            {isRequestingStart
              ? "Requesting access…"
              : "Allow camera, mic & start test"}
          </button>
        </div>
      </div>
    );
  }

  const isLastQuestion = currentIndex === test.questions.length - 1;
  const isCoding = currentQuestion.type === "coding";
  const selectedIndex = !isCoding ? answers[currentQuestion.id] : undefined;
  const currentLang = isCoding ? selectedLanguage[currentQuestion.id] : undefined;
  const availableLanguages = isCoding
    ? (Object.keys(currentQuestion.starterCode) as CodingLanguage[])
    : [];

  return (
    <div className="pt-10 relative">
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-bg/95 flex items-center justify-center p-6">
          <div className="card max-w-[440px] text-center border-coral">
            <p className="eyebrow text-coral">
              Violation {violationCount}/{MAX_VIOLATIONS_BEFORE_AUTO_SUBMIT}
            </p>
            <h2 className="text-lg mb-3">
              {violationReason ?? "A proctoring violation was detected."}
            </h2>
            <p className="text-text-2 text-sm mb-5">
              This is recorded as a proctoring violation. One more violation
              will auto-submit your test immediately with your current
              answers.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResumeAfterWarning}
            >
              Return to fullscreen & resume
            </button>
          </div>
        </div>
      )}

      <video
        ref={videoPreviewRef}
        autoPlay
        muted
        playsInline
        className="fixed bottom-5 right-5 w-[120px] h-[90px] object-cover rounded-lg border border-border-strong z-40"
      />

      <div className="flex items-center gap-3.5 mb-9">
        <span className="font-mono text-xs text-text-2">
          Question {currentIndex + 1}/{test.questions.length}
        </span>
        <div className="flex-1 h-1 rounded bg-card-2 overflow-hidden">
          <div
            className="h-full bg-amber"
            style={{
              width: `${((currentIndex + 1) / test.questions.length) * 100}%`,
            }}
          />
        </div>
        <span
          className={`font-mono text-xs ${
            secondsLeft <= 60 ? "text-coral" : "text-amber"
          }`}
        >
          {formatTime(secondsLeft)}
        </span>
      </div>

      <div className="flex gap-5">
        <div className="flex-none w-[180px]">
          <p className="eyebrow">Topics</p>
          {topics.map((topic) => (
            <div
              key={topic}
              className={`tag block mb-2 ${
                topic === currentQuestion.topic
                  ? "border-lime text-lime-ink"
                  : ""
              }`}
            >
              {topic}
            </div>
          ))}
        </div>

        <div className="flex-1 bg-surface border border-border rounded-card p-8">
          <p className="eyebrow">{currentQuestion.topic}</p>

          {!isCoding ? (
            <>
              <h2 className="text-xl leading-relaxed mb-6">
                {currentQuestion.question}
              </h2>

              {currentQuestion.options.map((option, idx) => (
                <div
                  key={idx}
                  onClick={() =>
                    setAnswers((prev) => ({
                      ...prev,
                      [currentQuestion.id]: idx,
                    }))
                  }
                  className={`flex items-center gap-3 px-4 py-3.5 border rounded-[10px] mb-2.5 text-sm cursor-pointer ${
                    selectedIndex === idx
                      ? "border-lime"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex-shrink-0 ${
                      selectedIndex === idx
                        ? "border-lime bg-lime"
                        : "border-border-strong"
                    }`}
                  />
                  {option}
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-xl">{currentQuestion.title}</h2>
                <span
                  className={`font-mono text-[11px] px-2.5 py-1 rounded-full uppercase ${
                    DIFFICULTY_STYLES[currentQuestion.difficulty]
                  }`}
                >
                  {currentQuestion.difficulty}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-body text-sm text-text-2 leading-relaxed mb-5">
                {currentQuestion.problemStatement}
              </pre>

              <div className="flex items-center gap-2 mb-2.5">
                <label className="text-xs text-text-2 font-mono">
                  Language:
                </label>
                <select
                  value={currentLang ?? ""}
                  onChange={(e) =>
                    handleLanguageChange(
                      currentQuestion,
                      e.target.value as CodingLanguage
                    )
                  }
                  className="bg-card-2 border border-border-strong rounded-md px-2.5 py-1.5 text-xs font-mono text-text"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>
                      {LANGUAGE_LABELS[lang]}
                    </option>
                  ))}
                </select>
              </div>

              <textarea
                value={
                  currentLang
                    ? codeByQuestion[currentQuestion.id]?.[currentLang] ?? ""
                    : ""
                }
                onChange={(e) =>
                  currentLang &&
                  handleCodeChange(
                    currentQuestion.id,
                    currentLang,
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  currentLang &&
                  handleCodeTab(e, currentQuestion.id, currentLang)
                }
                spellCheck={false}
                className="w-full h-72 bg-bg border border-border-strong rounded-md p-3.5 font-mono text-[13px] text-text resize-y leading-relaxed"
              />
            </>
          )}

          <div className="flex justify-between mt-7">
            <button
              type="button"
              className="btn btn-small disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              ← Previous
            </button>
            {isLastQuestion ? (
              <button
                type="button"
                className="btn btn-small btn-primary disabled:opacity-60"
                disabled={isSubmitting}
                onClick={handleSubmit}
              >
                {isSubmitting ? "Submitting…" : "Submit test"}
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-small btn-primary"
                onClick={() =>
                  setCurrentIndex((i) =>
                    Math.min(test.questions.length - 1, i + 1)
                  )
                }
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
