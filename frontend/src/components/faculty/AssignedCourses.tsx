import { useState } from "react";
import { api } from "../../lib/api";
import {
  PRIORITIES,
  errorMessage,
  inputClass,
  type Assignment,
} from "./types";
import { BookIcon, CheckIcon, ClockIcon, PencilIcon, TrashIcon } from "./icons";
import { Badge, CardHeader, EmptyState, Segmented } from "./ui";

interface RowProps {
  onChanged: () => void;
  onError: (message: string) => void;
}

const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-coral",
  medium: "bg-amber",
  low: "bg-text-3",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <Badge tone="teal">
        <CheckIcon width={10} height={10} /> Completed
      </Badge>
    );
  if (status === "in_progress") return <Badge tone="amber">In progress</Badge>;
  return <Badge tone="navy">Assigned</Badge>;
}

function AssignmentRow({
  assignment: a,
  onChanged,
  onError,
}: RowProps & { assignment: Assignment }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(a.title);
  const [topic, setTopic] = useState(a.topic);
  const [hours, setHours] = useState(String(a.estimatedHours));
  const [priority, setPriority] = useState(a.priority);
  const [reason, setReason] = useState(a.reason ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    const parsedHours = Number(hours);
    if (!title.trim() || !topic.trim() || !(parsedHours > 0)) return;
    setBusy(true);
    try {
      await api.patch(`/api/faculty/assignments/${a.id}`, {
        title,
        topic,
        priority,
        estimatedHours: parsedHours,
        reason,
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't save that assignment."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/api/faculty/assignments/${a.id}`);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't remove that assignment."));
      setBusy(false);
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <li className="py-3 border-b border-border last:border-0">
        <div className="flex flex-col gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
            aria-label="Course title"
            className={`${inputClass} !py-2`}
          />
          <div className="grid grid-cols-[1fr_84px] gap-2">
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic"
              aria-label="Topic"
              className={`${inputClass} !py-2`}
            />
            <input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              type="number"
              min="0.5"
              step="0.5"
              aria-label="Hours"
              className={`${inputClass} !py-2`}
            />
          </div>
          <Segmented
            size="sm"
            label="Priority"
            options={PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
          />
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Note shown to the student"
            aria-label="Note"
            className={`${inputClass} !py-2`}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-small btn-primary disabled:opacity-60"
              disabled={busy || !title.trim() || !topic.trim() || !(Number(hours) > 0)}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              className="text-text-2 text-xs hover:text-text"
              onClick={() => {
                setTitle(a.title);
                setTopic(a.topic);
                setHours(String(a.estimatedHours));
                setPriority(a.priority);
                setReason(a.reason ?? "");
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="py-2.5 border-b border-border last:border-0">
      <div className="flex items-start gap-2.5">
        <span
          title={`${a.priority} priority`}
          className={`mt-[7px] w-2 h-2 rounded-full flex-none ${
            PRIORITY_DOT[a.priority] ?? "bg-text-3"
          }`}
        />
        <div className="flex-1 min-w-0">
          <p
            className="text-[13.5px] font-medium leading-snug break-words"
            title={`Topic: ${a.topic}`}
          >
            {a.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
            <StatusBadge status={a.status} />
            <span className="inline-flex items-center gap-1 text-[11.5px] text-text-2">
              <ClockIcon width={11} height={11} /> {a.estimatedHours}h
            </span>
            <span className="text-[11.5px] text-text-2 capitalize">{a.priority}</span>
          </div>
          {a.reason && (
            <p className="text-text-2 text-xs italic mt-1 leading-snug line-clamp-2 break-words">
              “{a.reason}”
            </p>
          )}
        </div>
        <div className="flex items-center gap-0.5 flex-none">
          <button
            type="button"
            aria-label={`Edit ${a.title}`}
            className="p-1.5 rounded-lg text-text-2 hover:text-lime hover:bg-lime/10 transition"
            onClick={() => setEditing(true)}
          >
            <PencilIcon width={13} height={13} />
          </button>
          {confirming ? (
            <span className="flex items-center gap-1 pl-0.5">
              <button
                type="button"
                className="text-[11px] font-medium text-coral px-1.5 py-1 rounded hover:bg-coral/10 disabled:opacity-60"
                disabled={busy}
                onClick={() => void remove()}
              >
                Remove
              </button>
              <button
                type="button"
                className="text-[11px] text-text-2 px-1.5 py-1"
                onClick={() => setConfirming(false)}
              >
                Keep
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Remove ${a.title}`}
              className="p-1.5 rounded-lg text-text-2 hover:text-coral hover:bg-coral/10 transition"
              onClick={() => setConfirming(true)}
            >
              <TrashIcon width={13} height={13} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function AssignedCourses({
  assignments,
  onChanged,
  onError,
}: RowProps & { assignments: Assignment[] }) {
  return (
    <section className="card !p-4">
      <CardHeader
        dense
        icon={<BookIcon width={16} height={16} />}
        title="Assigned courses"
        subtitle="What this student is working through"
        right={
          assignments.length > 0 ? (
            <Badge tone="navy">{assignments.length}</Badge>
          ) : undefined
        }
      />
      {assignments.length === 0 ? (
        <EmptyState icon={<BookIcon width={20} height={20} />}>
          Nothing assigned yet. Use the course finder to give this student
          their first course.
        </EmptyState>
      ) : (
        <ul>
          {assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              onChanged={onChanged}
              onError={onError}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
