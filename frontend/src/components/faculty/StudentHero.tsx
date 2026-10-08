import type { StudentDetail } from "./types";
import { formatDate } from "./types";
import { Avatar, ScoreRing } from "./ui";
import { StatPill } from "../common/StatPill";
import { BookIcon, CheckIcon, ShieldIcon, SparkIcon } from "./icons";

export default function StudentHero({
  detail,
  openFlags,
}: {
  detail: StudentDetail;
  openFlags: number;
}) {
  const { student } = detail;
  const displayName = student.name ?? student.email;
  const openCourses = detail.assignments.filter(
    (a) => a.status !== "completed"
  ).length;
  const doneCourses = detail.assignments.length - openCourses;
  const weakCount = detail.weakTopics.length + detail.facultyWeakTopics.length;

  const score = detail.plagiarismScore;
  const similarityPct = score === null ? null : Math.round(score * 100);
  const aboveThreshold = score !== null && score >= detail.plagiarismThreshold;
  const similarityHint =
    score === null
      ? "not checked"
      : openFlags > 0
      ? "needs review"
      : aboveThreshold
      ? "cleared"
      : "original";
  const similarityTone = openFlags > 0 ? "coral" : score === null ? "white" : "teal";

  return (
    <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-5 py-[18px] sm:px-6 sm:py-5 shadow-lg">
      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-4 min-w-0 lg:w-[34%] lg:flex-none">
          <Avatar
            name={student.name}
            email={student.email}
            url={student.avatarUrl}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-lime">
              Student profile
            </span>
            <h1 className="text-[22px] leading-tight text-text break-words mt-2">
              {displayName}
            </h1>
            <p className="text-text-2 text-[14px] break-all leading-snug mt-0.5">
              {student.email}
              <span className="text-text-3"> · </span>
              {detail.resumeUploadedAt
                ? `Resume ${formatDate(detail.resumeUploadedAt)}`
                : "No resume yet"}
            </p>
            <span className="inline-flex items-center gap-1.5 mt-2 rounded-full bg-white border-2 border-border px-3 py-1 text-[13px] font-medium text-text">
              <span className="w-1.5 h-1.5 rounded-full bg-lime flex-none" />
              {detail.detectedField ?? "Field not detected yet"}
            </span>
          </div>
          <div className="lg:hidden">
            <ScoreRing score={detail.atsScore} size={68} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 flex-1 min-w-0">
          <StatPill
            tone="teal"
            icon={<BookIcon width={15} height={15} />}
            label="In progress"
            value={openCourses}
            hint={openCourses === 0 ? "none pending" : "underway"}
          />
          <StatPill
            tone="teal"
            icon={<CheckIcon width={15} height={15} strokeWidth={3} />}
            label="Completed"
            value={doneCourses}
            hint={doneCourses === 0 ? "none yet" : "finished"}
          />
          <StatPill
            tone="gold"
            icon={<SparkIcon width={15} height={15} />}
            label="Weak topics"
            value={weakCount}
            hint={weakCount === 0 ? "none flagged" : "needs work"}
          />
          <StatPill
            tone={similarityTone}
            icon={<ShieldIcon width={15} height={15} />}
            label="Similarity"
            value={similarityPct === null ? "—" : `${similarityPct}%`}
            hint={similarityHint}
          />
        </div>

        <div className="hidden lg:block flex-none">
          <ScoreRing score={detail.atsScore} size={84} />
        </div>
      </div>
    </section>
  );
}
