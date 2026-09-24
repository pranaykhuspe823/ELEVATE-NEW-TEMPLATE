import { useState, type ReactNode } from "react";
import { api } from "../../lib/api";
import { PlusIcon, SparkIcon } from "../faculty/icons";
import { errorMessage, inputClass } from "../faculty/types";
import { Segmented } from "../faculty/ui";
import { parseSkillInput } from "./skillParsing";
import { dateInputValue, type Drive, type DriveInput, type DriveStatus } from "./types";

// Matches the ML service's own cap (ml-service/app/routers/match.py).
const MAX_SKILLS = 40;

interface MergeResult {
  skills: string[];
  /** Unique new items that didn't fit under MAX_SKILLS and were left out. */
  overflow: number;
}

function mergeSkills(current: string[], incoming: string[]): MergeResult {
  const seen = new Set(current.map((s) => s.toLowerCase()));
  const out = [...current];
  let overflow = 0;
  for (const raw of incoming) {
    const skill = raw.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!skill) continue;
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    if (out.length >= MAX_SKILLS) {
      overflow++;
      continue;
    }
    seen.add(key);
    out.push(skill);
  }
  return { skills: out, overflow };
}

function capNoteFor(overflow: number): string | null {
  if (overflow === 0) return null;
  return `Reached the ${MAX_SKILLS}-skill limit — ${overflow} more ${
    overflow === 1 ? "wasn't" : "weren't"
  } added. Remove a few above to add more.`;
}

function Field({
  id,
  label,
  hint,
  action,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-semibold">
          {label} {hint && <span className="text-text-2 font-normal">· {hint}</span>}
        </label>
        {action}
      </div>
      {children}
    </div>
  );
}

interface Suggestion {
  description: string;
  techStack: string[];
}

export default function DriveForm({
  drive,
  onSubmit,
  onCancel,
}: {
  drive: Drive | null;
  onSubmit: (input: DriveInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [companyName, setCompanyName] = useState(drive?.companyName ?? "");
  const [roleTitle, setRoleTitle] = useState(drive?.roleTitle ?? "");
  const [driveDate, setDriveDate] = useState(dateInputValue(drive?.driveDate ?? null));
  const [location, setLocation] = useState(drive?.location ?? "");
  const [ctc, setCtc] = useState(drive?.ctc ?? "");
  const [status, setStatus] = useState<DriveStatus>(drive?.status ?? "upcoming");
  const [description, setDescription] = useState(drive?.description ?? "");
  const [skills, setSkills] = useState<string[]>(drive?.skills ?? []);
  const [skillDraft, setSkillDraft] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractNote, setExtractNote] = useState<string | null>(null);
  const [capNote, setCapNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const canExtract = description.trim().length >= 20 && !extracting;
  const canSuggest = roleTitle.trim().length >= 2 && !suggesting;
  const skillKeys = new Set(skills.map((s) => s.toLowerCase()));

  async function suggest() {
    setSuggesting(true);
    setError(null);
    try {
      const { data } = await api.post<Suggestion>("/api/drives/suggest", {
        companyName: companyName.trim() || undefined,
        roleTitle,
        description: description.trim() || undefined,
      });
      setSuggestion(data);
    } catch (err) {
      setError(errorMessage(err, "Couldn't draft a suggestion right now."));
    } finally {
      setSuggesting(false);
    }
  }

  function applyDescription(mode: "replace" | "append") {
    if (!suggestion) return;
    setDescription(
      mode === "append" && description.trim()
        ? `${description.trim()}\n\n${suggestion.description}`.slice(0, 8000)
        : suggestion.description
    );
    setSuggestion((s) => (s ? { ...s, description: "" } : s));
  }

  function addDraft() {
    const parts = parseSkillInput(skillDraft);
    if (parts.length === 0) return;
    const { skills: merged, overflow } = mergeSkills(skills, parts);
    setSkills(merged);
    setSkillDraft("");
    setCapNote(capNoteFor(overflow));
  }

  async function extract() {
    setExtracting(true);
    setExtractNote(null);
    setCapNote(null);
    setError(null);
    try {
      const { data } = await api.post<{ skills: string[] }>("/api/drives/extract-skills", {
        description,
      });
      const { skills: merged, overflow } = mergeSkills(skills, data.skills);
      const added = merged.length - skills.length;
      setSkills(merged);
      setExtractNote(
        added > 0
          ? `Added ${added} skill${added === 1 ? "" : "s"} from the description — review and edit below.`
          : "No new skills found — everything in the description is already listed."
      );
      setCapNote(capNoteFor(overflow));
    } catch (err) {
      setError(errorMessage(err, "Couldn't extract skills. Type them in instead."));
    } finally {
      setExtracting(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(null);
    // Anything typed but not yet added still counts.
    const finalSkills = skillDraft.trim() ? mergeSkills(skills, parseSkillInput(skillDraft)).skills : skills;
    try {
      await onSubmit({
        companyName,
        roleTitle,
        description,
        requiredSkills: finalSkills,
        driveDate: driveDate || null,
        location: location.trim() || null,
        ctc: ctc.trim() || null,
        status,
      });
    } catch (err) {
      setError(errorMessage(err, "Couldn't save this drive."));
      setSaving(false);
    }
  }

  return (
    <section className="card shadow-[0_1px_2px_rgba(31,41,55,0.04)] mb-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-[17px]">{drive ? `Edit ${drive.companyName}` : "Add a company drive"}</h2>
        <button type="button" className="text-xs text-text-2 hover:text-text" onClick={onCancel}>
          Cancel
        </button>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="drive-company" label="Company">
            <input
              id="drive-company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Infosys"
              maxLength={120}
              className={inputClass}
              required
            />
          </Field>
          <Field id="drive-role" label="Role">
            <input
              id="drive-role"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              placeholder="e.g. Systems Engineer"
              maxLength={120}
              className={inputClass}
              required
            />
          </Field>
          <Field id="drive-date" label="Drive date" hint="optional">
            <input
              id="drive-date"
              type="date"
              value={driveDate}
              onChange={(e) => setDriveDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="drive-ctc" label="Package" hint="optional">
            <input
              id="drive-ctc"
              value={ctc}
              onChange={(e) => setCtc(e.target.value)}
              placeholder="e.g. 6.5 LPA"
              maxLength={120}
              className={inputClass}
            />
          </Field>
          <Field id="drive-location" label="Venue / mode" hint="optional">
            <input
              id="drive-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Seminar Hall, or Online"
              maxLength={120}
              className={inputClass}
            />
          </Field>
          {drive && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold">Status</span>
              <Segmented<DriveStatus>
                label="Drive status"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "upcoming", label: "Upcoming" },
                  { value: "completed", label: "Visited" },
                ]}
              />
            </div>
          )}
        </div>

        <Field
          id="drive-jd"
          label="Job description"
          hint="paste it, or draft one with AI"
          action={
            <button
              type="button"
              onClick={() => void suggest()}
              disabled={!canSuggest}
              title={canSuggest || suggesting ? undefined : "Enter the role first"}
              className="btn btn-small inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparkIcon width={13} height={13} />
              {suggesting ? "Thinking…" : suggestion ? "Suggest again" : "Draft with AI"}
            </button>
          }
        >
          {suggestion && (
            <div
              role="region"
              aria-label="AI suggestion"
              className="rounded-xl border border-lime/25 bg-lime/5 p-3.5 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-semibold text-lime flex items-center gap-1.5">
                  <SparkIcon width={13} height={13} /> AI suggestion for {roleTitle.trim()}
                </p>
                <button
                  type="button"
                  aria-label="Dismiss suggestion"
                  onClick={() => setSuggestion(null)}
                  className="text-text-2 hover:text-text text-lg leading-none"
                >
                  ×
                </button>
              </div>

              {suggestion.techStack.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-xs font-semibold">Suggested tech stack — tap to add</p>
                    {suggestion.techStack.some((t) => !skillKeys.has(t.toLowerCase())) && (
                      <button
                        type="button"
                        className="text-xs font-medium text-lime hover:underline"
                        onClick={() => {
                          const { skills: merged, overflow } = mergeSkills(skills, suggestion.techStack);
                          setSkills(merged);
                          setCapNote(capNoteFor(overflow));
                        }}
                      >
                        Add all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestion.techStack.map((t) => {
                      const added = skillKeys.has(t.toLowerCase());
                      return (
                        <button
                          key={t}
                          type="button"
                          disabled={added}
                          onClick={() => {
                            const { skills: merged, overflow } = mergeSkills(skills, [t]);
                            setSkills(merged);
                            if (overflow > 0) {
                              setCapNote(`You're at the ${MAX_SKILLS}-skill limit — remove one to add ${t}.`);
                            }
                          }}
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[13px] font-medium transition ${
                            added
                              ? "bg-teal/10 text-teal border-teal/25 cursor-default"
                              : "bg-white text-text border-border-strong hover:border-lime hover:text-lime"
                          }`}
                        >
                          {added ? "✓" : "+"} {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {suggestion.description && (
                <div>
                  <p className="text-xs font-semibold mb-1.5">Draft description</p>
                  <p className="rounded-lg bg-white border border-border px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-line max-h-[220px] overflow-y-auto">
                    {suggestion.description}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {description.trim() ? (
                      <>
                        <button type="button" className="btn btn-small btn-primary" onClick={() => applyDescription("append")}>
                          Add to my description
                        </button>
                        <button type="button" className="btn btn-small" onClick={() => applyDescription("replace")}>
                          Replace mine
                        </button>
                      </>
                    ) : (
                      <button type="button" className="btn btn-small btn-primary" onClick={() => applyDescription("replace")}>
                        Use this description
                      </button>
                    )}
                  </div>
                </div>
              )}
              <p className="text-[11.5px] text-text-2">
                AI draft — check it against the company's actual posting before you save.
              </p>
            </div>
          )}
          <textarea
            id="drive-jd"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={7}
            maxLength={8000}
            placeholder="Paste the full job description here — responsibilities, requirements, tech stack…"
            className={`${inputClass} resize-y leading-relaxed`}
            required
          />
        </Field>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="drive-skill" className="text-[13px] font-semibold">
              Required skills{" "}
              <span className="text-text-2 font-normal">
                · students are matched against these ({skills.length}/{MAX_SKILLS})
              </span>
            </label>
            <button
              type="button"
              onClick={() => void extract()}
              disabled={!canExtract}
              className="btn btn-small inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparkIcon width={13} height={13} />
              {extracting ? "Reading…" : "Extract from description"}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#C4BAAB] bg-white px-2.5 py-2 min-h-[46px] focus-within:border-lime focus-within:ring-2 focus-within:ring-lime/20 transition">
            {skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 rounded-md bg-lime/10 border border-lime/20 text-lime pl-2 pr-1 py-0.5 text-[13px] font-medium"
              >
                {s}
                <button
                  type="button"
                  aria-label={`Remove ${s}`}
                  onClick={() => {
                    setSkills((prev) => prev.filter((x) => x !== s));
                    setCapNote(null);
                  }}
                  className="w-4 h-4 rounded flex items-center justify-center text-lime/70 hover:bg-lime/15 hover:text-lime"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="drive-skill"
              value={skillDraft}
              onChange={(e) => setSkillDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addDraft();
                } else if (e.key === "Backspace" && !skillDraft && skills.length > 0) {
                  setSkills((prev) => prev.slice(0, -1));
                }
              }}
              onPaste={(e) => {
                // A single-line <input> silently drops newlines from whatever
                // value ends up in `onChange` (and some browsers don't even
                // replace them with a space), which is how a multi-line,
                // multi-category tech-stack paste used to turn into garbled,
                // run-together fragments. Reading the clipboard directly, before
                // the browser touches the input's value, keeps real line breaks
                // intact for the parser -- so it's only intercepted when the
                // paste is clearly a list (has a comma or a line break); a
                // single word/phrase still lands in the box normally.
                const text = e.clipboardData.getData("text");
                if (!/[,\n]/.test(text)) return;
                e.preventDefault();
                const parts = parseSkillInput(text);
                if (parts.length === 0) return;
                const { skills: merged, overflow } = mergeSkills(skills, parts);
                setSkills(merged);
                setSkillDraft("");
                setCapNote(capNoteFor(overflow));
              }}
              onBlur={addDraft}
              placeholder={skills.length === 0 ? "Type a skill and press Enter" : "Add another…"}
              className="flex-1 min-w-[140px] bg-transparent text-[14px] text-text placeholder:text-text-2 px-1.5 py-0.5 focus:outline-none"
              disabled={skills.length >= MAX_SKILLS}
            />
          </div>

          {extractNote ? (
            <p role="status" className="text-xs text-teal font-medium">
              {extractNote}
            </p>
          ) : (
            <p className="text-xs text-text-2">
              Leave this empty and we'll read the skills out of the job description when you save.
              Pasting a longer tech-stack list (with categories, commas, and parentheses) works too —
              it's split into individual skills automatically.
            </p>
          )}
          {capNote && (
            <p role="alert" className="text-xs text-amber font-medium">
              {capNote}
            </p>
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-coral/30 bg-coral/5 px-4 py-3 text-sm text-coral"
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="btn btn-primary inline-flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={saving || !companyName.trim() || !roleTitle.trim() || description.trim().length < 20}
          >
            {!drive && <PlusIcon width={15} height={15} />}
            {saving ? "Saving…" : drive ? "Save changes" : "Add drive"}
          </button>
          <button type="button" className="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
