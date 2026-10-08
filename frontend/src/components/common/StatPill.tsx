import type { ReactNode } from "react";

const TONE_ICON: Record<string, string> = {
  gold: "bg-[#FFC93C]/20 text-[#FFC93C]",
  teal: "bg-teal/20 text-teal",
  coral: "bg-coral/20 text-coral",
  white: "bg-lime/10 text-lime",
};

/** A compact icon + number stat, used in a row across the top of a hero
 * banner. Smaller and more colorful than a plain KPI tile on purpose --
 * meant to read at a glance, not dominate the section. */
export function StatPill({
  icon,
  value,
  label,
  hint,
  tone = "white",
}: {
  icon: ReactNode;
  value: string | number;
  label: string;
  hint?: string;
  tone?: keyof typeof TONE_ICON;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white border-2 border-border px-4 py-3.5 min-w-0 shadow-sm">
      <span
        className={`flex-none w-11 h-11 rounded-xl border-2 border-border flex items-center justify-center ${TONE_ICON[tone]}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display font-extrabold text-[24px] leading-none text-text truncate">
          {value}
        </span>
        <span className="block font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-text-2 mt-1.5 truncate">
          {label}
        </span>
        {hint && (
          <span className="block text-[13px] font-medium text-text-2 mt-0.5 truncate">{hint}</span>
        )}
      </span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{children}</div>;
}
