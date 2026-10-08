import { Link } from "react-router-dom";
import { Avatar, ScoreRing } from "../faculty/ui";
import { StatPill, StatRow } from "../common/StatPill";
import { BuildingIcon, CheckIcon, ShieldIcon, UsersIcon } from "../faculty/icons";
import {
  phaseDotClass,
  phaseHint,
  phaseLabel,
  planLabel,
  type CollegeInfo,
  type FacultyRow,
  type SubscriptionInfo,
} from "./types";

export default function CollegeHero({
  college,
  subscription,
  facultyCount,
  faculty,
}: {
  college: CollegeInfo;
  subscription: SubscriptionInfo | null;
  facultyCount: number;
  faculty: FacultyRow[];
}) {
  const seats = subscription?.facultySeats ?? 0;
  const seatsLeft = Math.max(0, seats - facultyCount);
  const seatPercent = seats > 0 ? Math.round((facultyCount / seats) * 100) : 0;
  const studentsLinked = faculty.reduce((sum, f) => sum + f.studentCount, 0);
  const activeFaculty = faculty.filter((f) => f.setupComplete).length;
  const awaiting = faculty.length - activeFaculty;

  const planTone = subscription
    ? subscription.phase === "grace" || subscription.phase === "expired"
      ? "coral"
      : subscription.phase === "trialing"
      ? "gold"
      : "teal"
    : "white";

  return (
    <section className="relative overflow-hidden rounded-[20px] border-2 border-border panel-gradient px-5 py-[18px] sm:px-7 sm:py-5 shadow-lg">
      <div className="relative flex flex-col md:flex-row md:items-center gap-5">
        <Avatar name={college.name} email="" size={64} />
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border-2 border-border px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.13em] text-lime">
            <BuildingIcon width={12} height={12} />
            College dashboard
          </span>
          <h1 className="text-[22px] sm:text-[26px] leading-tight text-text mt-2 break-words">
            {college.name}
          </h1>
          <p className="text-text-2 text-[13px] mt-1 break-all">
            {college.domain ? `${college.domain} · ` : ""}
            Placement cell overview
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {subscription ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white border-2 border-border px-3.5 py-1.5 text-[13px]">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${phaseDotClass(subscription.phase)}`}
                />
                {phaseLabel(subscription)}
                <span className="text-text-3">·</span>
                {planLabel(subscription.planKey)} plan
              </span>
            ) : (
              <>
                <span className="inline-flex items-center gap-2 rounded-full bg-white border-2 border-border px-3.5 py-1.5 text-[13px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FFC93C]" />
                  No plan yet
                </span>
                <Link
                  to="/college/subscribe"
                  className="inline-block rounded-full bg-[#FFC93C] text-lime-dim px-4 py-1.5 text-[13px] font-semibold no-underline hover:bg-[#FFC93C]/90 transition-colors"
                >
                  Choose a plan
                </Link>
              </>
            )}
          </div>
        </div>
        {subscription && (
          <ScoreRing score={seatPercent} size={88} label="% seats" />
        )}
      </div>

      <div className="relative mt-4">
        <StatRow>
          <StatPill
            tone="gold"
            icon={<UsersIcon width={15} height={15} />}
            label="Seats"
            value={subscription ? `${facultyCount}/${seats}` : "—"}
            hint={
              !subscription
                ? "start a trial"
                : !subscription.canAddFaculty
                ? "plan expired"
                : seatsLeft > 0
                ? `${seatsLeft} free`
                : "all in use"
            }
          />
          <StatPill
            tone="teal"
            icon={<UsersIcon width={15} height={15} />}
            label="Students"
            value={studentsLinked}
            hint="across faculty"
          />
          <StatPill
            tone="teal"
            icon={<CheckIcon width={15} height={15} strokeWidth={3} />}
            label="Active"
            value={activeFaculty}
            hint={awaiting > 0 ? `${awaiting} awaiting` : "all set up"}
          />
          <StatPill
            tone={planTone}
            icon={<ShieldIcon width={15} height={15} />}
            label="Plan"
            value={subscription ? planLabel(subscription.planKey) : "None"}
            hint={subscription ? phaseHint(subscription).replace(/ \d{4}$/, "") : "not subscribed"}
          />
        </StatRow>
      </div>
    </section>
  );
}
