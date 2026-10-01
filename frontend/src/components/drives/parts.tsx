import type { ReactNode } from "react";
import { CheckIcon, ClockIcon, SparkIcon } from "../faculty/icons";
import {
  FIT_BAR,
  FIT_LABEL,
  FIT_TEXT,
  companyInitial,
  countdown,
  daysUntil,
  fitTone,
  formatDriveDate,
  type Drive,
} from "./types";

const CHIP_TONES = {
  matched: "bg-teal/10 text-teal border-teal/25",
  missing: "bg-coral/10 text-coral border-coral/25",
  neutral: "bg-card-2 text-text border-border-strong",
} as const;

export function SkillChip({
  tone = "neutral",
  children,
  onClick,
  title,
}: {
  tone?: keyof typeof CHIP_TONES;
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  const cls = `inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[12px] font-medium leading-5 ${CHIP_TONES[tone]}`;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`${cls} hover:brightness-95 transition cursor-pointer`}
      >
        {children}
      </button>
    );
  }
  return (
    <span className={cls} title={title}>
      {tone === "matched" && <CheckIcon width={11} height={11} strokeWidth={3} />}
      {children}
    </span>
  );
}

/** Horizontal fit meter with the percentage beside it. */
export function FitBar({
  score,
  wide = false,
}: {
  score: number;
  wide?: boolean;
}) {
  const tone = fitTone(score);
  return (
    <div
      className={`flex items-center gap-2.5 ${wide ? "w-full" : "w-[150px]"}`}
      role="img"
      aria-label={`${score}% skill match — ${FIT_LABEL[tone]}`}
    >
      <div className="h-2 flex-1 rounded-full bg-card-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${FIT_BAR[tone]}`}
          style={{ width: `${Math.max(score, 3)}%` }}
        />
      </div>
      <span className={`w-9 text-right text-[13px] font-semibold tabular-nums ${FIT_TEXT[tone]}`}>
        {score}%
      </span>
    </div>
  );
}

export function CompanyMark({
  name,
  size = 44,
  onDark = false,
}: {
  name: string;
  size?: number;
  onDark?: boolean;
}) {
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      className={`flex-none rounded-xl flex items-center justify-center font-display font-bold ${
        onDark
          ? "bg-white/15 text-white border border-white/20"
          : "bg-lime/10 text-lime border border-lime/15"
      }`}
      aria-hidden="true"
    >
      {companyInitial(name)}
    </span>
  );
}

/** Date · location · package as small pill chips, with a live countdown chip. */
export function DriveMeta({
  drive,
  onDark = false,
}: {
  drive: Pick<Drive, "driveDate" | "location" | "ctc" | "status">;
  onDark?: boolean;
}) {
  const soon = drive.driveDate && drive.status !== "completed" && daysUntil(drive.driveDate) <= 3;
  const when = countdown(drive);
  const chip = onDark
    ? "bg-white/12 text-white/85"
    : "bg-card-2 text-text-2";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${chip}`}>
        <ClockIcon width={10} height={10} />
        {drive.driveDate ? formatDriveDate(drive.driveDate) : "Date TBA"}
      </span>
      {drive.location && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip}`}>{drive.location}</span>
      )}
      {drive.ctc && (
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${chip}`}>{drive.ctc}</span>
      )}
      {when && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            soon
              ? "bg-lime-ink text-lime-dim"
              : onDark
              ? "bg-white/15 text-white"
              : "bg-lime/10 text-lime"
          }`}
        >
          {when}
        </span>
      )}
      {drive.status === "completed" && (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            onDark ? "bg-white/15 text-white" : "bg-card-2 text-text-2"
          }`}
        >
          Visited
        </span>
      )}
    </div>
  );
}

export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-coral/30 bg-coral/5 px-4 py-3"
    >
      <p className="text-coral text-sm">{message}</p>
      {onDismiss && (
        <button
          type="button"
          className="text-coral/70 hover:text-coral text-xs flex-none"
          onClick={onDismiss}
        >
          Dismiss
        </button>
      )}
    </div>
  );
}

/** Gradient banner used at the top of every drives view. */
export function DrivesHero({
  eyebrow,
  title,
  blurb,
  action,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  blurb: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-5 py-[18px] sm:px-7 sm:py-5 shadow-lg">
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-lime">
            <SparkIcon width={11} height={11} />
            {eyebrow}
          </span>
          <h1 className="text-[22px] sm:text-[26px] leading-tight text-text mt-2 break-words">
            {title}
          </h1>
          <p className="text-text font-semibold text-[16px] mt-2 max-w-[600px] leading-relaxed">{blurb}</p>
        </div>
        {action}
      </div>
      {children && <div className="relative mt-4">{children}</div>}
    </section>
  );
}

export function Skeleton() {
  return (
    <div className="pt-6 animate-pulse" aria-busy="true" aria-label="Loading campus drives">
      <div className="h-[190px] rounded-[22px] bg-card-2" />
      <div className="mt-6 h-[300px] rounded-card bg-card-2" />
    </div>
  );
}
