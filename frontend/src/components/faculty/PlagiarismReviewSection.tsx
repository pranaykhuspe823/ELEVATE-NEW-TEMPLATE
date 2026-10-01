import { useState } from "react";
import { api } from "../../lib/api";
import { errorMessage, inputClass, type PlagiarismMatch } from "./types";
import { ShieldIcon, SparkIcon } from "./icons";
import { Badge, CardHeader, Segmented } from "./ui";

interface RowProps {
  onChanged: () => void;
  onError: (message: string) => void;
}

const REVIEW_OPTIONS = [
  { value: "open", label: "Needs review" },
  { value: "confirmed", label: "Confirmed copy" },
  { value: "cleared", label: "Not plagiarism" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "cleared") return <Badge tone="teal">Cleared</Badge>;
  if (status === "confirmed") return <Badge tone="coral">Confirmed</Badge>;
  return <Badge tone="amber">Needs review</Badge>;
}

function ReviewControls({
  match,
  onChanged,
  onError,
}: RowProps & { match: PlagiarismMatch }) {
  const [status, setStatus] = useState(match.reviewStatus);
  const [note, setNote] = useState(match.facultyNote ?? "");
  const [busy, setBusy] = useState(false);
  const dirty =
    status !== match.reviewStatus || note.trim() !== (match.facultyNote ?? "");

  async function save() {
    setBusy(true);
    try {
      await api.patch(`/api/faculty/plagiarism/${match.id}`, {
        reviewStatus: status,
        facultyNote: note,
      });
      onChanged();
    } catch (err) {
      onError(errorMessage(err, "Couldn't save your review."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl bg-bg/70 border border-border p-4">
      <p className="text-xs font-medium text-text-2 mb-2.5">Your decision</p>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <Segmented
          label="Review decision"
          options={REVIEW_OPTIONS}
          value={status}
          onChange={setStatus}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          aria-label="Review note"
          className={`${inputClass} flex-1`}
        />
        <button
          type="button"
          className="btn btn-small btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          {busy ? "Saving…" : "Save decision"}
        </button>
      </div>
      {status === "cleared" && (
        <p className="text-text-3 text-xs mt-2.5">
          Clearing removes the flag from this student's page and your roster.
        </p>
      )}
    </div>
  );
}

export default function PlagiarismReviewSection({
  matches,
  onChanged,
  onError,
}: RowProps & { matches: PlagiarismMatch[] }) {
  return (
    <section
      id="plagiarism-review"
      className="card scroll-mt-24"
    >
      <CardHeader
        icon={<ShieldIcon width={18} height={18} />}
        title="Plagiarism review"
        subtitle="Compare the overlapping content side by side, then decide"
      />

      <div className="flex flex-col gap-5">
        {matches.map((m) => (
          <article
            key={m.id}
            className="rounded-2xl border border-border p-5 bg-white"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-text-3">
                  Closely resembles
                </p>
                <h3 className="text-[17px] mt-0.5">
                  {m.redacted
                    ? "A resume outside your college"
                    : m.matchedStudentName}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.reviewStatus} />
                <span
                  className={`font-display font-semibold text-[22px] ${
                    m.reviewStatus === "cleared" ? "text-teal" : "text-coral"
                  }`}
                >
                  {Math.round(m.similarityScore * 100)}%
                </span>
              </div>
            </div>

            {m.explanation && (
              <div className="mt-4 flex gap-3 rounded-xl bg-lime-ink/10 border border-lime-ink/25 px-4 py-3">
                <SparkIcon
                  width={16}
                  height={16}
                  className="flex-none mt-0.5 text-lime-ink"
                />
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.12em] text-lime-ink">
                    AI summary
                  </p>
                  <p className="text-sm leading-relaxed mt-0.5">{m.explanation}</p>
                </div>
              </div>
            )}

            {m.overlap.length > 0 && (
              <div className="mt-5">
                <div className="hidden md:grid grid-cols-2 gap-3 mb-2">
                  <p className="text-xs font-medium text-text-2">This student</p>
                  <p className="text-xs font-medium text-text-2">Matched resume</p>
                </div>
                <div className="flex flex-col gap-3">
                  {m.overlap.map((o, i) => (
                    <div key={i} className="grid md:grid-cols-2 gap-3">
                      <div className="rounded-xl bg-lime/5 border border-lime/15 px-4 py-3">
                        <p className="md:hidden text-[11px] font-medium text-text-2 mb-1">
                          This student
                        </p>
                        <p className="text-sm leading-relaxed">{o.yours}</p>
                      </div>
                      <div className="rounded-xl bg-coral/5 border border-coral/15 px-4 py-3">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="md:hidden text-[11px] font-medium text-text-2">
                            Matched resume
                          </p>
                          <span className="ml-auto text-[11px] font-mono text-coral">
                            {Math.round(o.similarity * 100)}% match
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed">{o.theirs}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <ReviewControls match={m} onChanged={onChanged} onError={onError} />
          </article>
        ))}
      </div>
    </section>
  );
}
