import { useState } from "react";
import { api } from "../../lib/api";
import {
  errorMessage,
  inputClass,
  type FacultyWeakTopic,
  type WeakTopic,
} from "./types";
import { CheckIcon, PencilIcon, PlusIcon, SearchIcon, TargetIcon, TrashIcon } from "./icons";
import { Badge, CardHeader, EmptyState } from "./ui";

interface RowProps {
  onChanged: () => void;
  onError: (message: string) => void;
  onFindCourse: (topic: string) => void;
}

function FindCourseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-0.5 text-[11px] font-medium text-text hover:border-lime hover:text-lime hover:bg-lime/5 transition flex-none"
    >
      <SearchIcon width={10} height={10} /> Find course
    </button>
  );
}

function FacultyTopicRow({
  item,
  onChanged,
  onError,
  onFindCourse,
}: RowProps & { item: FacultyWeakTopic }) {
  const [editing, setEditing] = useState(false);
  const [topic, setTopic] = useState(item.topic);
  const [note, setNote] = useState(item.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save() {
    if (!topic.trim()) return;
    setBusy(true);
    try {
      await api.patch(`/api/faculty/weak-topics/${item.id}`, { topic, note });
      setEditing(false);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't save that weak topic."));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/api/faculty/weak-topics/${item.id}`);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't remove that weak topic."));
      setBusy(false);
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <li className="py-2.5 border-b border-border last:border-0">
        <div className="flex flex-col gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic"
            aria-label="Topic"
            className={`${inputClass} !py-2`}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
            className={`${inputClass} !py-2`}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="btn btn-small btn-primary disabled:opacity-60"
              disabled={busy || !topic.trim()}
              onClick={() => void save()}
            >
              Save
            </button>
            <button
              type="button"
              className="text-text-2 text-xs hover:text-text"
              onClick={() => {
                setTopic(item.topic);
                setNote(item.note ?? "");
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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0 flex items-center gap-2 flex-wrap">
          <span className="text-[13.5px] font-medium break-words">{item.topic}</span>
          <Badge tone="gold">Added by you</Badge>
        </div>
        <div className="flex items-center gap-1 flex-none">
          <FindCourseButton onClick={() => onFindCourse(item.topic)} />
          <button
            type="button"
            aria-label={`Edit ${item.topic}`}
            className="p-1.5 rounded-lg text-text-2 hover:text-lime hover:bg-lime/10 transition"
            onClick={() => setEditing(true)}
          >
            <PencilIcon width={13} height={13} />
          </button>
          {confirming ? (
            <span className="flex items-center gap-1">
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
              aria-label={`Remove ${item.topic}`}
              className="p-1.5 rounded-lg text-text-2 hover:text-coral hover:bg-coral/10 transition"
              onClick={() => setConfirming(true)}
            >
              <TrashIcon width={13} height={13} />
            </button>
          )}
        </div>
      </div>
      {item.note && (
        <p className="text-text-2 text-xs mt-1 leading-snug">{item.note}</p>
      )}
    </li>
  );
}

export default function WeakTopicsCard({
  studentId,
  weakTopics,
  facultyTopics,
  assignedTopics,
  onChanged,
  onError,
  onFindCourse,
}: RowProps & {
  studentId: string;
  weakTopics: WeakTopic[];
  facultyTopics: FacultyWeakTopic[];
  assignedTopics: Set<string>;
}) {
  const [adding, setAdding] = useState(false);
  const [topic, setTopic] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!topic.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/faculty/students/${studentId}/weak-topics`, {
        topic,
        note,
      });
      setTopic("");
      setNote("");
      setAdding(false);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't add that weak topic."));
    } finally {
      setBusy(false);
    }
  }

  const isEmpty = weakTopics.length === 0 && facultyTopics.length === 0;

  return (
    <section className="card !p-4">
      <CardHeader
        dense
        icon={<TargetIcon width={16} height={16} />}
        title="Weak topics"
        subtitle="Where this student needs support"
        right={
          !adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-1 text-xs font-medium hover:border-lime hover:text-lime transition"
            >
              <PlusIcon width={11} height={11} /> Add
            </button>
          ) : undefined
        }
      />

      {adding && (
        <form
          className="flex flex-col gap-2 rounded-xl bg-bg/70 border border-border p-2.5 mb-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <input
            autoFocus
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic, e.g. Recursion"
            aria-label="Weak topic"
            className={`${inputClass} !py-2`}
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            aria-label="Note"
            className={`${inputClass} !py-2`}
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="btn btn-small btn-primary disabled:opacity-60"
              disabled={busy || !topic.trim()}
            >
              {busy ? "Adding…" : "Add topic"}
            </button>
            <button
              type="button"
              className="text-text-2 text-xs hover:text-text"
              onClick={() => {
                setAdding(false);
                setTopic("");
                setNote("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isEmpty && !adding ? (
        <EmptyState icon={<TargetIcon width={20} height={20} />}>
          No weak topics yet. They appear after a skills test — or add one
          you've spotted yourself.
        </EmptyState>
      ) : (
        <ul>
          {weakTopics.map((t) => {
            const pct = t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0;
            return (
              <li key={t.topic} className="py-2.5 border-b border-border last:border-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[13.5px] font-medium min-w-0 break-words">
                    {t.topic}
                  </span>
                  <div className="flex items-center gap-1.5 flex-none">
                    {assignedTopics.has(t.topic) && (
                      <Badge tone="teal">
                        <CheckIcon width={10} height={10} /> Assigned
                      </Badge>
                    )}
                    <FindCourseButton onClick={() => onFindCourse(t.topic)} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1 rounded-full bg-card-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-coral"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-text-2 flex-none">
                    {t.correct}/{t.total} correct
                  </span>
                </div>
              </li>
            );
          })}
          {facultyTopics.map((t) => (
            <FacultyTopicRow
              key={t.id}
              item={t}
              onChanged={onChanged}
              onError={onError}
              onFindCourse={onFindCourse}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
