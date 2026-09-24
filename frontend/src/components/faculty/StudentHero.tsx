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
    <section className="relative overflow-hidden rounded-[20px] bg-gradient-to-br from-lime-dim via-lime to-[#2B4F91] text-white px-5 py-[18px] sm:px-6 sm:py-5 shadow-[0_14px_32px_-18px_rgba(20,41,79,0.6)]">
      <div className="pointer-events-none absolute -right-16 -top-20 w-64 h-64 rounded-full bg-lime-ink/25 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
        <div className="flex items-center gap-4 min-w-0 lg:w-[34%] lg:flex-none">
          <Avatar
            name={student.name}
            email={student.email}
            url={student.avatarUrl}
            size={56}
          />
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-[#E5B94E]">
              Student profile
            </span>
            <h1 className="text-[21px] leading-tight text-white break-words mt-1.5">
              {displayName}
            </h1>
            <p className="text-white/70 text-[13px] break-all leading-snug">
              {student.email}
              <span className="text-white/40"> · </span>
              {detail.resumeUploadedAt
                ? `Resume ${formatDate(detail.resumeUploadedAt)}`
                : "No resume yet"}
            </p>
            <span className="inline-flex items-center gap-1.5 mt-1.5 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5B94E] flex-none" />
              {detail.detectedField ?? "Field not detected yet"}
            </span>
          </div>
          <div className="lg:hidden">
            <ScoreRing score={detail.atsScore} size={68} dark />
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
          <ScoreRing score={detail.atsScore} size={84} dark />
        </div>
      </div>
    </section>
  );
}
