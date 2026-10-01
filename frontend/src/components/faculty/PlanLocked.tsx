import { ShieldIcon } from "./icons";

/** Shown to faculty when their college's plan has expired (the API answers
 * 402). Nothing is deleted -- it just pauses until the college pays. */
export default function PlanLocked({ message }: { message: string }) {
  return (
    <div className="pt-8 pb-10 max-w-[560px] mx-auto">
      <div className="card !p-7 sm:!p-9">
        <span className="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center mb-5">
          <ShieldIcon width={24} height={24} />
        </span>
        <p className="eyebrow">Plan expired</p>
        <h1 className="text-[26px] leading-tight mb-3">Access is paused</h1>
        <p className="text-text-2 text-sm leading-relaxed">{message}</p>
        <p className="text-text-2 text-sm leading-relaxed mt-3">
          Nothing is lost — your students, courses and notes are all still here,
          and access returns as soon as the plan is activated.
        </p>
      </div>
    </div>
  );
}
