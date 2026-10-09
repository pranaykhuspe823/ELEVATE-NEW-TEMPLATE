import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import PlatformIcon from "../PlatformIcon";
import { AtsBoostBadge, ProgressBar } from "../faculty/ui";
import { BookIcon, ClockIcon, SparkIcon } from "../faculty/icons";
import { errorMessage } from "../faculty/types";

interface RecommendedModule {
  id: string;
  title: string;
  topic: string;
  priority: string;
  estimatedHours: number;
  resources: { platform: string; type: string; url: string }[];
  keywords: string[];
  atsBoost: number;
  projectedScore: number | null;
  enrollment: { assignmentId: string; status: string; progressPercent: number } | null;
}

interface CoursePlanResponse {
  status: "generating" | "ready" | "failed";
  atsScore: number | null;
  combinedBoost: number;
  combinedProjectedScore: number | null;
  modules: RecommendedModule[];
}

const POLL_MS = 3000;
// The plan is one LLM call; past ~2 minutes something has gone wrong.
const MAX_POLLS = 40;

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-coral",
  medium: "bg-amber",
  low: "bg-text-3",
};

function ModuleRow({
  module: m,
  onStart,
  starting,
}: {
  module: RecommendedModule;
  onStart: (m: RecommendedModule) => void;
  starting: boolean;
}) {
  return (
    <li className="py-3.5 border-b border-border last:border-b-0">
      <div className="flex items-start gap-2.5">
        <span
          title={`${m.priority} priority`}
          className={`mt-[7px] w-2 h-2 rounded-full flex-none ${PRIORITY_DOT[m.priority] ?? "bg-text-3"}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[15px] font-medium leading-snug break-words">{m.title}</p>
            <AtsBoostBadge
              points={m.atsBoost}
              keywords={m.keywords}
              projectedScore={m.projectedScore}
            />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-2">
            <span className="inline-flex items-center gap-1">
              <BookIcon width={11} height={11} /> {m.topic}
            </span>
            <span className="inline-flex items-center gap-1">
              <ClockIcon width={11} height={11} /> {m.estimatedHours}h
            </span>
            {m.keywords.length > 0 && (
              <span className="text-text-3">
                Adds to your resume: {m.keywords.join(", ")}
              </span>
            )}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {m.resources.map((r) => (
                <a
                  key={r.platform}
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`Search on ${r.platform}`}
                  className="hover:opacity-80 hover:scale-105 transition-transform"
                >
                  <PlatformIcon platform={r.platform} />
                </a>
              ))}
            </div>
            {m.enrollment ? (
              <Link
                to="/assignments"
                className="flex items-center gap-2.5 text-xs text-text-2 no-underline hover:text-lime"
                title="Update your progress in My assignments"
              >
                <ProgressBar percent={m.enrollment.progressPercent} className="w-[110px]" />
                <span className="font-mono">{m.enrollment.progressPercent}%</span>
                <span>Track progress →</span>
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-small btn-primary disabled:opacity-60"
                disabled={starting}
                onClick={() => onStart(m)}
              >
                {starting ? "Starting…" : "Start course"}
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export default function RecommendedCourses({ testId }: { testId: string }) {
  const [plan, setPlan] = useState<CoursePlanResponse | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let polls = 0;

    async function poll() {
      try {
        const { data } = await api.get<CoursePlanResponse>(
          `/api/tests/${testId}/course-plan`
        );
        if (cancelled) return;
        setPlan(data);
        if (data.status === "generating") {
          polls += 1;
          if (polls >= MAX_POLLS) setTimedOut(true);
          else timer = setTimeout(poll, POLL_MS);
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, "Couldn't load your recommended courses."));
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [testId]);

  async function start(m: RecommendedModule) {
    setStartingId(m.id);
    setError(null);
    try {
      const { data } = await api.post<{ id: string; status: string; progressPercent: number }>(
        "/api/assignments/enroll",
        { moduleId: m.id }
      );
      setPlan((prev) =>
        prev && {
          ...prev,
          modules: prev.modules.map((x) =>
            x.id === m.id
              ? {
                  ...x,
                  enrollment: {
                    assignmentId: data.id,
                    status: data.status,
                    progressPercent: data.progressPercent,
                  },
                }
              : x
          ),
        }
      );
    } catch (err) {
      setError(errorMessage(err, "Couldn't start that course."));
    } finally {
      setStartingId(null);
    }
  }

  const header = (
    <div className="flex items-center gap-2 mb-1.5">
      <SparkIcon width={16} height={16} className="text-lime-ink" />
      <h2>Courses for you</h2>
    </div>
  );

  if (!plan && !error) {
    return (
      <div className="card mb-5">
        {header}
        <p className="text-text-2 text-sm">Loading your recommended courses…</p>
      </div>
    );
  }

  if (!plan || plan.status === "failed" || timedOut) {
    return (
      <div className="card mb-5">
        {header}
        <p className="text-text-2 text-sm">
          {error ??
            "We couldn't build your course recommendations this time. Your faculty can still assign courses from your results."}
        </p>
      </div>
    );
  }

  if (plan.status === "generating") {
    return (
      <div className="card mb-5">
        {header}
        <p className="text-text-2 text-sm">
          Building courses from your weak topics and the keywords missing from your resume…
        </p>
      </div>
    );
  }

  return (
    <div className="card mb-5">
      {header}
      <p className="text-text-2 text-xs mb-3.5">
        Picked from your weak test topics and the keywords an ATS couldn't find on
        your resume.
        {plan.combinedBoost > 0 && plan.atsScore !== null && plan.combinedProjectedScore !== null && (
          <>
            {" "}
            Finish them all and your ATS score can go from{" "}
            <span className="font-semibold text-text">{plan.atsScore}</span> to{" "}
            <span className="font-semibold text-teal">{plan.combinedProjectedScore}</span>.
          </>
        )}
      </p>

      {error && (
        <p className="text-coral text-xs mb-3" role="alert">
          {error}
        </p>
      )}

      {plan.modules.length === 0 ? (
        <p className="text-text-2 text-sm py-2">
          No courses needed — you did well on every topic and your resume already has the
          keywords for your field.
        </p>
      ) : (
        <ul>
          {plan.modules.map((m) => (
            <ModuleRow
              key={m.id}
              module={m}
              starting={startingId === m.id}
              onStart={(x) => void start(x)}
            />
          ))}
        </ul>
      )}

      {plan.modules.some((m) => m.atsBoost > 0) && (
        <p className="text-text-3 text-[11.5px] mt-3 leading-relaxed">
          The ATS gain counts once you add the skills you learn to your resume. Re-upload it
          after a course to see your new score. Your faculty can see the courses you start and
          your progress.
        </p>
      )}
    </div>
  );
}
