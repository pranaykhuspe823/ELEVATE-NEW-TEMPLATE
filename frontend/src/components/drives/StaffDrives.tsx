import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import PlanLocked from "../faculty/PlanLocked";
import {
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  PencilIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
} from "../faculty/icons";
import { EmptyState, Segmented } from "../faculty/ui";
import { StatPill, StatRow } from "../common/StatPill";
import { errorMessage } from "../faculty/types";
import DriveForm from "./DriveForm";
import {
  CompanyMark,
  DriveMeta,
  DrivesHero,
  ErrorBanner,
  Skeleton,
  SkillChip,
} from "./parts";
import {
  daysUntil,
  formatDriveDate,
  skillSummary,
  type Drive,
  type DriveInput,
} from "./types";
import { useDrives } from "./useDrives";

type Filter = "upcoming" | "completed" | "all";

function DriveRow({
  drive,
  canManage,
  confirming,
  busy,
  onEdit,
  onToggleStatus,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  drive: Drive;
  canManage: boolean;
  confirming: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  const skills = skillSummary(drive.skills, 6);
  const done = drive.status === "completed";

  return (
    <li className="px-4 sm:px-5 py-3.5">
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <CompanyMark name={drive.companyName} size={40} />
          <div className="min-w-0 flex-1">
            <h2 className={`text-[15px] font-semibold leading-snug break-words ${done ? "text-text-2" : ""}`}>
              <Link
                to={`/drives/${drive.id}`}
                className="no-underline text-inherit hover:text-lime transition-colors"
              >
                {drive.companyName}
              </Link>
              <span className="text-text-2 font-normal"> · {drive.roleTitle}</span>
            </h2>
            <div className="mt-1.5">
              <DriveMeta drive={drive} />
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-1.5">
              {skills.shown.map((s) => (
                <SkillChip key={s}>{s}</SkillChip>
              ))}
              {skills.extra > 0 && (
                <span className="text-xs text-text-2">+{skills.extra} more</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 flex-none pl-[58px] md:pl-0">
          <Link
            to={`/drives/${drive.id}`}
            className="btn btn-small btn-primary no-underline"
          >
            {canManage ? "Readiness" : "Student readiness"}
          </Link>
          {canManage &&
            (confirming ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-coral/30 bg-coral/5 px-2.5 py-1.5 text-xs">
                <span className="text-coral font-medium">Delete this drive?</span>
                <button
                  type="button"
                  className="font-semibold text-coral hover:underline disabled:opacity-60"
                  onClick={onDelete}
                  disabled={busy}
                >
                  Yes, delete
                </button>
                <button type="button" className="text-text-2 hover:text-text" onClick={onCancelDelete}>
                  Keep
                </button>
              </span>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-small inline-flex items-center gap-1.5"
                  onClick={onEdit}
                >
                  <PencilIcon width={12} height={12} /> Edit
                </button>
                <button
                  type="button"
                  className="btn btn-small disabled:opacity-60"
                  onClick={onToggleStatus}
                  disabled={busy}
                >
                  {done ? "Mark upcoming" : "Mark visited"}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${drive.companyName}`}
                  title="Delete"
                  className="btn btn-small !px-2.5 text-coral hover:!bg-coral/10"
                  onClick={onAskDelete}
                >
                  <TrashIcon width={13} height={13} />
                </button>
              </>
            ))}
        </div>
      </div>
    </li>
  );
}

export default function StaffDrives({ role }: { role: "FACULTY" | "COLLEGE_ADMIN" }) {
  const { data, error, locked, reload } = useDrives();
  const canManage = role === "COLLEGE_ADMIN";
  const [filter, setFilter] = useState<Filter | null>(null);
  const [editing, setEditing] = useState<Drive | "new" | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const drives = data?.drives ?? [];
    const upcoming = drives.filter((d) => d.status !== "completed");
    const next = upcoming
      .filter((d) => d.driveDate && daysUntil(d.driveDate) >= 0)
      .sort((a, b) => a.driveDate!.localeCompare(b.driveDate!))[0];
    return {
      upcoming: upcoming.length,
      completed: drives.length - upcoming.length,
      companies: new Set(drives.map((d) => d.companyName.toLowerCase())).size,
      next,
    };
  }, [data]);

  async function save(input: DriveInput) {
    if (editing && editing !== "new") {
      await api.patch(`/api/drives/${editing.id}`, input);
    } else {
      await api.post("/api/drives", input);
    }
    setEditing(null);
    setActionError(null);
    await reload();
  }

  async function toggleStatus(d: Drive) {
    setBusyId(d.id);
    try {
      await api.patch(`/api/drives/${d.id}`, {
        status: d.status === "completed" ? "upcoming" : "completed",
      });
      await reload();
    } catch (err) {
      setActionError(errorMessage(err, "Couldn't update that drive."));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(d: Drive) {
    setBusyId(d.id);
    try {
      await api.delete(`/api/drives/${d.id}`);
      setConfirmId(null);
      await reload();
    } catch (err) {
      setActionError(errorMessage(err, "Couldn't delete that drive."));
      setConfirmId(null);
    } finally {
      setBusyId(null);
    }
  }

  if (locked) return <PlanLocked message={locked} />;
  if (error) {
    return (
      <div className="pt-6">
        <ErrorBanner message={error} />
      </div>
    );
  }
  if (!data) return <Skeleton />;

  const drives = data.drives;
  const activeFilter: Filter = filter ?? (stats.upcoming > 0 ? "upcoming" : "all");
  const visible = drives.filter((d) =>
    activeFilter === "all" ? true : activeFilter === "completed" ? d.status === "completed" : d.status !== "completed"
  );

  return (
    <div className="pt-6">
      <DrivesHero
        eyebrow={canManage ? "Placement cell" : "Placement readiness"}
        title="Campus drives"
        blurb={
          canManage
            ? "Add the companies visiting campus with their job descriptions. Students see how their resume fits each one, and you see how ready the whole college is."
            : "Companies visiting your campus. Open one to see which of your students fit it and which skills they're missing — then assign the right courses."
        }
        action={
          canManage && editing === null ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#E5B94E] text-lime-dim px-5 py-2.5 text-sm font-semibold hover:bg-[#EFC55E] transition-colors flex-none"
            >
              <PlusIcon width={15} height={15} strokeWidth={2.5} /> Add company
            </button>
          ) : undefined
        }
      >
        <StatRow>
          <StatPill tone="gold" icon={<ClockIcon width={15} height={15} />} label="Upcoming" value={stats.upcoming} hint="scheduled" />
          <StatPill tone="teal" icon={<CheckIcon width={15} height={15} strokeWidth={3} />} label="Visited" value={stats.completed} hint="on campus" />
          <StatPill tone="teal" icon={<BuildingIcon width={15} height={15} />} label="Companies" value={stats.companies} hint="on list" />
          <StatPill
            tone="coral"
            icon={<CalendarIcon width={15} height={15} />}
            label="Next"
            value={stats.next?.driveDate ? formatDriveDate(stats.next.driveDate).replace(/,? \d{4}$/, "") : "—"}
            hint={stats.next ? stats.next.companyName : "Not scheduled"}
          />
        </StatRow>
      </DrivesHero>

      <div className="mt-5">
        {actionError && <ErrorBanner message={actionError} onDismiss={() => setActionError(null)} />}

        {canManage && editing !== null && (
          <DriveForm
            key={editing === "new" ? "new" : editing.id}
            drive={editing === "new" ? null : editing}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        )}

        {drives.length === 0 ? (
          // With the add form open, the empty state would just repeat it.
          editing === null && (
            <div className="max-w-[560px] mx-auto mt-8">
              <EmptyState icon={<TargetIcon width={26} height={26} />}>
                {canManage
                  ? "No companies yet. Add the first campus drive with its job description — students will see how they match, right away."
                  : "Your placement cell hasn't added any campus drives yet. They'll show up here as soon as they do."}
              </EmptyState>
              {canManage && (
                <div className="text-center mt-5">
                  <button type="button" className="btn btn-primary btn-small" onClick={() => setEditing("new")}>
                    Add the first company
                  </button>
                </div>
              )}
            </div>
          )
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h2 className="text-[18px]">Companies</h2>
              <Segmented<Filter>
                label="Filter drives"
                value={activeFilter}
                onChange={setFilter}
                options={[
                  { value: "upcoming", label: `Upcoming (${stats.upcoming})` },
                  { value: "completed", label: `Visited (${stats.completed})` },
                  { value: "all", label: `All (${drives.length})` },
                ]}
              />
            </div>
            {visible.length === 0 ? (
              <div className="card">
                <p className="text-text-2 text-sm">No drives in this view.</p>
              </div>
            ) : (
              <ul className="card !p-0 overflow-hidden divide-y divide-border shadow-[0_1px_2px_rgba(31,41,55,0.04)]">
                {visible.map((d) => (
                  <DriveRow
                    key={d.id}
                    drive={d}
                    canManage={canManage}
                    confirming={confirmId === d.id}
                    busy={busyId === d.id}
                    onEdit={() => {
                      setActionError(null);
                      setEditing(d);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    onToggleStatus={() => void toggleStatus(d)}
                    onAskDelete={() => setConfirmId(d.id)}
                    onCancelDelete={() => setConfirmId(null)}
                    onDelete={() => void remove(d)}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
