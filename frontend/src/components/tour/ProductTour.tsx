import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { AuthUser } from "../../lib/auth";
import { TOURS, type TourStep } from "./tours";

const CARD_WIDTH = 340;
const GAP = 14; // between the highlighted element and the card
const PAD = 8; // spotlight padding around the element
const EDGE = 16; // keep the card this far from the viewport edges
const WAIT_FOR_PAGE_MS = 6000;

// Bump to show the tour again to everyone who has already seen it.
const seenKey = (userId: string) => `elevate.tour.v1.${userId}`;

function hasSeen(userId: string) {
  try {
    return localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

function markSeen(userId: string) {
  try {
    localStorage.setItem(seenKey(userId), "1");
  } catch {
    // Private mode / blocked storage: the tour just shows again next visit.
  }
}

/** The element a step points at, if it's actually visible right now. */
function findTarget(step: TourStep | undefined): HTMLElement | null {
  if (!step?.target) return null;
  const el = document.querySelector<HTMLElement>(`[data-tour="${CSS.escape(step.target)}"]`);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? el : null;
}

interface Layout {
  spot: { top: number; left: number; width: number; height: number } | null;
  card: { top: number; left: number };
}

function computeLayout(target: HTMLElement | null, cardHeight: number): Layout {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - EDGE * 2);
  if (!target) {
    return {
      spot: null,
      card: { top: Math.max(EDGE, (vh - cardHeight) / 2), left: (vw - width) / 2 },
    };
  }
  const r = target.getBoundingClientRect();
  const spot = {
    top: r.top - PAD,
    left: r.left - PAD,
    width: r.width + PAD * 2,
    height: r.height + PAD * 2,
  };
  const below = spot.top + spot.height + GAP;
  const above = spot.top - GAP - cardHeight;
  const top =
    below + cardHeight <= vh - EDGE
      ? below
      : above >= EDGE
      ? above
      : // Too tall to fit either side (a big card on a short screen): pin it to the bottom.
        Math.max(EDGE, vh - cardHeight - EDGE);
  const left = Math.min(Math.max(EDGE, r.left + r.width / 2 - width / 2), vw - width - EDGE);
  return { spot, card: { top, left } };
}

/** Guided tour of the signed-in user's home page. Runs once per user on
 * their first visit; bump `replay` to run it again on demand. */
export default function ProductTour({ user, replay }: { user: AuthUser; replay: number }) {
  const tour = TOURS[user.role];
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [steps, setSteps] = useState<TourStep[]>(tour.steps);
  const [layout, setLayout] = useState<Layout | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const pendingStart = useRef(false);

  const step = steps[index];
  const onHome = location.pathname === tour.home;

  // Ask for a run: on first visit, or when "Take the tour" is clicked.
  useEffect(() => {
    if (!hasSeen(user.id)) pendingStart.current = true;
  }, [user.id]);

  useEffect(() => {
    if (replay === 0) return;
    pendingStart.current = true;
    setOpen(false);
    if (location.pathname !== tour.home) navigate(tour.home);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replay]);

  // Start once the home page has rendered what the tour points at (its data
  // loads asynchronously). If it never does -- e.g. the page shows an error
  // -- don't start, and don't mark the tour seen.
  useEffect(() => {
    if (!onHome || open || !pendingStart.current) return;
    const firstTarget = tour.steps.find((s) => s.target);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      if (findTarget(firstTarget)) {
        window.clearInterval(timer);
        pendingStart.current = false;
        setSteps(tour.steps.filter((s) => !s.optional || findTarget(s)));
        setIndex(0);
        setOpen(true);
      } else if (Date.now() - startedAt > WAIT_FOR_PAGE_MS) {
        window.clearInterval(timer);
        pendingStart.current = false;
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [onHome, open, tour, replay]);

  // Leaving the page mid-tour ends it.
  useEffect(() => {
    if (open && !onHome) setOpen(false);
  }, [open, onHome]);

  const close = useCallback(() => {
    setOpen(false);
    markSeen(user.id);
  }, [user.id]);

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= steps.length) close();
      else if (next >= 0) setIndex(next);
    },
    [index, steps.length, close]
  );

  // Bring the step's element into view, then measure.
  useLayoutEffect(() => {
    if (!open) return;
    const target = findTarget(step);
    const rect = target?.getBoundingClientRect();
    if (target && rect && (rect.top < 80 || rect.bottom > window.innerHeight - 40)) {
      target.scrollIntoView({ block: "center" });
    }
    const measure = () =>
      setLayout(computeLayout(findTarget(step), cardRef.current?.offsetHeight ?? 200));
    measure();
    // Second pass once the card has rendered at its real height.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step]);

  useEffect(() => {
    if (open) nextRef.current?.focus();
  }, [open, index]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close, go]);

  if (!open || !step) return null;

  const isLast = index === steps.length - 1;
  const spot = layout?.spot ?? null;

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite">
      {/* Dims everything and swallows clicks, so the page can't be used mid-tour. */}
      <div className="absolute inset-0" />
      {spot ? (
        <div
          aria-hidden="true"
          className="absolute rounded-2xl ring-2 ring-white/80 transition-all duration-300 ease-out pointer-events-none"
          style={{ ...spot, boxShadow: "0 0 0 9999px rgba(12, 18, 56, 0.58)" }}
        />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 bg-[rgba(12,18,56,0.58)]" />
      )}

      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="absolute rounded-2xl border-2 border-border bg-white p-5 shadow-lg transition-[top,left] duration-300 ease-out"
        style={{
          width: `min(${CARD_WIDTH}px, calc(100vw - ${EDGE * 2}px))`,
          top: layout?.card.top ?? "50%",
          left: layout?.card.left ?? "50%",
          visibility: layout ? "visible" : "hidden",
        }}
      >
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-lime">
          Step {index + 1} of {steps.length}
        </p>
        <h2 id="tour-title" className="text-[17px] leading-snug mt-1.5">
          {step.title}
        </h2>
        <p id="tour-body" className="text-text-2 text-[14px] leading-relaxed mt-1.5">
          {step.body}
        </p>

        <div className="flex items-center gap-1.5 mt-4" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-lime" : i < index ? "w-1.5 bg-lime/50" : "w-1.5 bg-border-strong"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 mt-4">
          <button
            type="button"
            onClick={close}
            className="text-sm text-text-2 hover:text-text"
          >
            {isLast ? "Close" : "Skip tour"}
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button type="button" className="btn btn-small" onClick={() => go(-1)}>
                Back
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              className="btn btn-small btn-primary"
              onClick={() => go(1)}
            >
              {isLast ? "Finish" : index === 0 ? "Show me around" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
