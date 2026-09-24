import { useEffect, useState } from "react";

interface StepLoaderProps {
  steps: string[];
  stepDurationMs?: number;
}

export default function StepLoader({
  steps,
  stepDurationMs = 12000,
}: StepLoaderProps) {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (activeStep >= steps.length - 1) return;
    const timer = setTimeout(() => setActiveStep((s) => s + 1), stepDurationMs);
    return () => clearTimeout(timer);
  }, [activeStep, steps.length, stepDurationMs]);

  return (
    <div className="flex flex-col gap-4">
      {steps.map((label, idx) => {
        const done = idx < activeStep;
        const current = idx === activeStep;
        return (
          <div key={label} className="flex items-center gap-3">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${
                done
                  ? "bg-lime border-lime text-white"
                  : current
                  ? "border-lime-ink text-lime-ink animate-pulse"
                  : "border-border-strong text-text-3"
              }`}
            >
              {done ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2 6l2.5 2.5L10 3"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
            </span>
            <span
              className={`text-sm transition-colors ${
                current ? "text-text" : done ? "text-text-2" : "text-text-3"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
