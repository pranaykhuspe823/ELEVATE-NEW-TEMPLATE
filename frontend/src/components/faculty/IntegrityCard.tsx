import { CheckIcon, ShieldIcon } from "./icons";
import { Badge, CardHeader, EmptyState } from "./ui";

export default function IntegrityCard({
  score,
  threshold,
  openFlags,
  totalMatches,
}: {
  score: number | null;
  threshold: number;
  openFlags: number;
  totalMatches: number;
}) {
  const pct = score === null ? 0 : Math.round(score * 100);
  const thresholdPct = Math.round(threshold * 100);
  const barColor =
    score === null
      ? "bg-text-3"
      : score >= threshold
      ? "bg-coral"
      : pct >= 50
      ? "bg-amber"
      : "bg-teal";

  return (
    <section className="card !p-4">
      <CardHeader
        dense
        icon={<ShieldIcon width={16} height={16} />}
        title="Resume integrity"
        subtitle="Similarity to other students' resumes"
        right={
          score === null ? undefined : openFlags > 0 ? (
            <Badge tone="coral">Needs review</Badge>
          ) : (
            <Badge tone="teal">
              <CheckIcon width={10} height={10} /> All clear
            </Badge>
          )
        }
      />

      {score === null ? (
        <EmptyState icon={<ShieldIcon width={20} height={20} />}>
          Not checked yet. It runs automatically whenever this student uploads
          a resume.
        </EmptyState>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-[26px] leading-none w-[58px] flex-none">
              {pct}%
            </span>
            <div className="relative flex-1">
              <div className="h-2 rounded-full bg-card-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span
                className="absolute -top-1 bottom-[-4px] w-px bg-text-3/60"
                style={{ left: `${thresholdPct}%` }}
                aria-hidden="true"
              />
            </div>
            <span className="text-text-2 text-[11px] flex-none">
              flag ≥ {thresholdPct}%
            </span>
          </div>

          {openFlags > 0 ? (
            <p className="mt-2.5 text-sm text-coral font-medium">
              {openFlags} close {openFlags === 1 ? "match needs" : "matches need"} your
              review{" "}
              <a
                href="#plagiarism-review"
                className="text-lime font-medium hover:underline whitespace-nowrap"
              >
                Compare ↓
              </a>
            </p>
          ) : totalMatches > 0 ? (
            <p className="mt-2.5 text-teal text-sm">
              Every flagged match has been reviewed.
            </p>
          ) : (
            <p className="mt-2.5 text-text-2 text-sm">
              No suspicious overlap with any other resume.
            </p>
          )}
        </>
      )}
    </section>
  );
}
