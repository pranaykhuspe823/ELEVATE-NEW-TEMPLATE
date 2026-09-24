import type { ReactNode } from "react";

const TONE_ICON: Record<string, string> = {
  gold: "bg-[#E5B94E]/20 text-[#E5B94E]",
  teal: "bg-[#8EE0BF]/20 text-[#8EE0BF]",
  coral: "bg-[#FFB4A2]/20 text-[#FFB4A2]",
  white: "bg-white/15 text-white",
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
    <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 border border-white/10 px-3 py-2.5 backdrop-blur-sm min-w-0">
      <span
        className={`flex-none w-8 h-8 rounded-lg flex items-center justify-center ${TONE_ICON[tone]}`}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold text-[18px] leading-none text-white truncate">
          {value}
        </span>
        <span className="block font-mono text-[9px] uppercase tracking-[0.1em] text-white/55 mt-1 truncate">
          {label}
        </span>
        {hint && (
          <span className="block text-[11px] text-white/75 mt-0.5 truncate">{hint}</span>
        )}
      </span>
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">{children}</div>;
}
