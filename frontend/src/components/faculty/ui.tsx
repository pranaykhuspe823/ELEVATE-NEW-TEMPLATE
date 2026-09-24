import { useState, type ReactNode } from "react";
import { assetUrl } from "../../lib/api";
import { BookIcon } from "./icons";
import { initials } from "./types";

export function Avatar({
  name,
  email,
  url,
  size = 48,
}: {
  name: string | null;
  email: string;
  url?: string | null;
  size?: number;
}) {
  const src = assetUrl(url);
  // Track *which* URL failed, so a newly uploaded photo isn't blocked by an
  // earlier broken one.
  const [brokenSrc, setBrokenSrc] = useState<string | null>(null);
  const style = { width: size, height: size, fontSize: size * 0.36 };
  if (src && brokenSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setBrokenSrc(src)}
        style={style}
        className="rounded-full object-cover flex-none ring-2 ring-white/40"
      />
    );
  }
  return (
    <div
      style={style}
      className="rounded-full flex-none flex items-center justify-center font-display font-semibold text-white bg-gradient-to-br from-lime to-lime-ink ring-2 ring-white/40"
    >
      {initials(name, email)}
    </div>
  );
}

export function ScoreRing({
  score,
  size = 96,
  dark = false,
  label = "ATS",
}: {
  score: number | null;
  size?: number;
  dark?: boolean;
  label?: string;
}) {
  const stroke = Math.max(6, size * 0.085);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score === null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div
      className="relative flex-none"
      style={{ width: size, height: size }}
      role="img"
      aria-label={score === null ? `No ${label} score` : `${label} score ${score} out of 100`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={dark ? "rgba(255,255,255,0.18)" : "#E7E5E4"}
          strokeWidth={stroke}
        />
        {pct > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={dark ? "#E5B94E" : "#1E3A6E"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center ${
          dark ? "text-white" : "text-text"
        }`}
      >
        <span
          className="font-display font-bold leading-none"
          style={{ fontSize: size * 0.32 }}
        >
          {score === null ? "—" : score}
        </span>
        <span
          className={`font-mono uppercase tracking-wider mt-0.5 ${
            dark ? "text-white/60" : "text-text-3"
          }`}
          style={{ fontSize: Math.max(8, size * 0.1) }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

const BADGE_TONES = {
  teal: "bg-teal/10 text-teal",
  amber: "bg-amber/10 text-amber",
  coral: "bg-coral/10 text-coral",
  navy: "bg-lime/10 text-lime",
  gold: "bg-lime-ink/15 text-[#8a6410]",
  neutral: "bg-card-2 text-text-2",
} as const;

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function CompactKpi({
  label,
  value,
  hint,
  hintClass = "text-white/60",
}: {
  label: string;
  value: string | number;
  hint: string;
  hintClass?: string;
}) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-white/10 border border-white/10 px-4 py-3 backdrop-blur-sm">
      <span className="font-display font-semibold text-[28px] leading-none text-white">
        {value}
      </span>
      <span className="min-w-0">
        <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
          {label}
        </span>
        <span className={`block text-xs mt-0.5 leading-snug ${hintClass}`}>
          {hint}
        </span>
      </span>
    </div>
  );
}

export function KpiTile({
  label,
  value,
  hint,
  hintClass = "text-white/60",
}: {
  label: string;
  value: string | number;
  hint: string;
  hintClass?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3.5 backdrop-blur-sm">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/60">
        {label}
      </p>
      <p className="font-display font-semibold text-[26px] leading-none mt-2 text-white">
        {value}
      </p>
      <p className={`text-xs mt-1.5 ${hintClass}`}>{hint}</p>
    </div>
  );
}

export function ProviderBadge({ provider }: { provider: string }) {
  const style =
    provider === "YouTube"
      ? "bg-[#FF0000]/10 text-[#c4302b]"
      : provider === "Microsoft Learn"
      ? "bg-[#0078D4]/10 text-[#0067b8]"
      : "bg-lime/10 text-lime";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 ${style}`}
    >
      <BookIcon width={11} height={11} />
      {provider}
    </span>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid grid-flow-col auto-cols-fr w-full sm:w-auto sm:inline-grid rounded-xl border border-border-strong bg-card-2 p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`${
            size === "sm"
              ? "px-2 sm:px-2.5 py-1 text-[11px]"
              : "px-2 sm:px-3 py-1.5 text-xs"
          } font-medium leading-tight text-center rounded-[10px] transition ${
            value === o.value
              ? "bg-lime text-white shadow-sm"
              : "text-text-2 hover:text-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  right,
  dense = false,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  dense?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-3 ${dense ? "mb-2.5" : "mb-4"}`}
    >
      <div className={`flex items-center min-w-0 ${dense ? "gap-2.5" : "gap-3"}`}>
        {icon && (
          <span
            className={`flex-none rounded-xl bg-lime/10 text-lime flex items-center justify-center ${
              dense ? "w-8 h-8" : "w-9 h-9"
            }`}
          >
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className={`${dense ? "text-[15px]" : "text-[17px]"} leading-tight`}>
            {title}
          </h2>
          {subtitle && (
            <p className={`text-text-2 mt-0.5 ${dense ? "text-[11.5px]" : "text-xs"}`}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {right}
    </div>
  );
}

export function EmptyState({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 rounded-xl border border-dashed border-border-strong bg-bg/60 px-4 py-6">
      <span className="text-text-3">{icon}</span>
      <p className="text-text-2 text-xs leading-relaxed max-w-[260px]">{children}</p>
    </div>
  );
}
