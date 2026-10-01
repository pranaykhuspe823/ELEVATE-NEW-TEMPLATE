import { useState } from "react";
import { api } from "../../lib/api";
import { errorMessage } from "../faculty/types";
import { CheckIcon, CopyIcon, TrashIcon, UsersIcon } from "../faculty/icons";
import { Avatar, Badge, CardHeader, EmptyState } from "../faculty/ui";
import type { FacultyRow } from "./types";

function CodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked (insecure context); the code stays visible to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title="Copy share code"
      aria-label={`Copy share code ${code}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 font-mono text-[12px] tracking-wider hover:border-lime hover:text-lime transition"
    >
      {code}
      {copied ? (
        <CheckIcon width={12} height={12} className="text-teal" />
      ) : (
        <CopyIcon width={12} height={12} className="text-text-2" />
      )}
    </button>
  );
}

function RosterRow({
  member: f,
  onChanged,
  onError,
}: {
  member: FacultyRow;
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api.delete(`/api/colleges/faculty/${f.id}`);
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't remove that faculty member."));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <li className="py-4 border-b border-border last:border-0">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <Avatar name={f.name} email={f.email} size={44} />
          <div className="min-w-0">
            <h3 className="text-[15px] leading-snug truncate">{f.name ?? f.email}</h3>
            <p className="text-text-2 text-sm truncate">{f.email}</p>
            {!f.setupComplete && (
              <p className="text-amber text-xs mt-0.5">
                Hasn't set a password yet
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            <UsersIcon width={12} height={12} /> {f.studentCount} student
            {f.studentCount === 1 ? "" : "s"}
          </Badge>
          <Badge tone={f.setupComplete ? "teal" : "amber"}>
            {f.setupComplete ? "Active" : "Awaiting setup"}
          </Badge>
          {f.facultyCode && <CodeChip code={f.facultyCode} />}

          {confirming ? (
            <span className="flex items-center gap-1.5 pl-1">
              <button
                type="button"
                className="text-xs font-medium text-white bg-coral rounded-full px-3 py-1.5 hover:opacity-90 disabled:opacity-60"
                disabled={busy}
                onClick={() => void remove()}
              >
                {busy ? "Removing…" : "Yes, remove"}
              </button>
              <button
                type="button"
                className="text-xs text-text-2 px-2 py-1.5 hover:text-text"
                onClick={() => setConfirming(false)}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              aria-label={`Remove ${f.name ?? f.email}`}
              title="Remove faculty"
              className="p-2 rounded-lg text-text-2 hover:text-coral hover:bg-coral/10 transition"
              onClick={() => setConfirming(true)}
            >
              <TrashIcon width={16} height={16} />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

export default function FacultyRoster({
  faculty,
  onChanged,
  onError,
}: {
  faculty: FacultyRow[];
  onChanged: () => void;
  onError: (message: string) => void;
}) {
  return (
    <section className="card">
      <CardHeader
        icon={<UsersIcon width={18} height={18} />}
        title="Faculty roster"
        subtitle="Everyone with access to student data"
        right={faculty.length > 0 ? <Badge tone="navy">{faculty.length}</Badge> : undefined}
      />
      {faculty.length === 0 ? (
        <EmptyState icon={<UsersIcon width={24} height={24} />}>
          No faculty added yet. Add your first faculty member using the form
          and they'll appear here.
        </EmptyState>
      ) : (
        <ul>
          {faculty.map((f) => (
            <RosterRow
              key={f.id}
              member={f}
              onChanged={onChanged}
              onError={onError}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
