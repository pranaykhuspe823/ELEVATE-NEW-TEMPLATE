import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import {
  PRIORITIES,
  errorMessage,
  formatDuration,
  inputClass,
  type CourseSearchResponse,
  type CourseSearchResult,
  type SuggestedModule,
} from "./types";
import {
  CheckIcon,
  ClockIcon,
  ExternalIcon,
  PlusIcon,
  SearchIcon,
  SparkIcon,
} from "./icons";
import { AtsBoostBadge, Badge, CardHeader, ProviderBadge, Segmented } from "./ui";

interface Props {
  studentId: string;
  studentFirstName: string;
  suggestedSearches: string[];
  aiModules: SuggestedModule[];
  request: { query: string; nonce: number } | null;
  onAssigned: () => void;
  onError: (message: string) => void;
}

const PRIORITY_OPTIONS = PRIORITIES.map((p) => ({
  value: p,
  label: p.charAt(0).toUpperCase() + p.slice(1),
}));

function LevelBadge({ level }: { level: string }) {
  const tone =
    level === "beginner" ? "teal" : level === "advanced" ? "coral" : "amber";
  return <Badge tone={tone}>{level.charAt(0).toUpperCase() + level.slice(1)}</Badge>;
}

function ResultSkeleton() {
  return (
    <div className="px-4 py-3 animate-pulse">
      <div className="h-4 w-3/5 rounded bg-card-2 mb-2" />
      <div className="h-3 w-2/5 rounded bg-card-2 mb-1.5" />
      <div className="h-3 w-4/5 rounded bg-card-2" />
    </div>
  );
}

export default function CourseFinder({
  studentId,
  studentFirstName,
  suggestedSearches,
  aiModules,
  request,
  onAssigned,
  onError,
}: Props) {
  const [query, setQuery] = useState("");
  const [searchedFor, setSearchedFor] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [response, setResponse] = useState<CourseSearchResponse | null>(null);
  const [assigningUrl, setAssigningUrl] = useState<string | null>(null);
  const [assignedUrls, setAssignedUrls] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const [priority, setPriority] = useState<string>("medium");
  const [reason, setReason] = useState("");

  const [manualOpen, setManualOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [hours, setHours] = useState("2");
  const [link, setLink] = useState("");
  const [isAssigningManual, setIsAssigningManual] = useState(false);
  const [assigningModule, setAssigningModule] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function runSearch(rawQuery: string) {
    const q = rawQuery.trim();
    if (q.length < 2) return;
    setIsSearching(true);
    setSearchError(null);
    try {
      const { data } = await api.get<CourseSearchResponse>(
        "/api/faculty/course-search",
        { params: { q } }
      );
      setResponse(data);
      setSearchedFor(q);
    } catch (err) {
      setSearchError(errorMessage(err, "Couldn't search courses right now."));
    } finally {
      setIsSearching(false);
    }
  }

  const requestNonce = request?.nonce;
  useEffect(() => {
    if (!request) return;
    setQuery(request.query);
    void runSearch(request.query);
    // Only a fresh request (new nonce) should trigger a search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestNonce]);

  async function assignResult(result: CourseSearchResult) {
    setAssigningUrl(result.url);
    try {
      await api.post(`/api/faculty/students/${studentId}/assignments`, {
        title: result.title,
        topic: (topic.trim() || searchedFor || result.title).slice(0, 100),
        priority,
        estimatedHours: result.durationMinutes
          ? Math.max(0.5, Math.round((result.durationMinutes / 60) * 2) / 2)
          : Number(hours) || 2,
        reason: reason.trim() || undefined,
        resources: [
          {
            platform: result.provider,
            type:
              result.kind === "video" || result.kind === "playlist"
                ? "video"
                : "course",
            url: result.url,
            title: result.title,
          },
        ],
      });
      setAssignedUrls((prev) => new Set(prev).add(result.url));
      setNotice(`Assigned "${result.title}" to ${studentFirstName}.`);
      onAssigned();
    } catch (err) {
      onError(errorMessage(err, "Couldn't assign that course."));
    } finally {
      setAssigningUrl(null);
    }
  }

  async function assignModule(module: SuggestedModule) {
    setAssigningModule(module.id);
    try {
      await api.post(`/api/faculty/students/${studentId}/assignments`, {
        sourceModuleId: module.id,
        reason: reason.trim() || undefined,
      });
      setNotice(`Assigned "${module.title}" to ${studentFirstName}.`);
      onAssigned();
    } catch (err) {
      onError(errorMessage(err, "Couldn't assign that module."));
    } finally {
      setAssigningModule(null);
    }
  }

  function customizeModule(module: SuggestedModule) {
    setTitle(module.title);
    setTopic(module.topic);
    setHours(String(module.estimatedHours));
    setPriority(module.priority);
    setManualOpen(true);
  }

  async function assignManual() {
    if (!title.trim() || !topic.trim()) return;

    let resources:
      | { platform: string; type: string; url: string; title: string }[]
      | undefined;
    if (link.trim()) {
      try {
        const url = new URL(link.trim());
        resources = [
          {
            platform: url.hostname.replace(/^www\./, ""),
            type: "course",
            url: url.toString(),
            title: title.trim(),
          },
        ];
      } catch {
        onError("That course link isn't a valid URL.");
        return;
      }
    }

    setIsAssigningManual(true);
    try {
      await api.post(`/api/faculty/students/${studentId}/assignments`, {
        title: title.trim(),
        topic: topic.trim(),
        priority,
        estimatedHours: Number(hours) || 2,
        reason: reason.trim() || undefined,
        resources,
      });
      setNotice(`Assigned "${title.trim()}" to ${studentFirstName}.`);
      setTitle("");
      setTopic("");
      setHours("2");
      setLink("");
      onAssigned();
    } catch (err) {
      onError(errorMessage(err, "Couldn't assign that course."));
    } finally {
      setIsAssigningManual(false);
    }
  }

  return (
    <section
      id="course-finder"
      className="card !p-0 overflow-hidden scroll-mt-24"
    >
      <div className="p-4 sm:p-5">
        <CardHeader
          dense
          icon={<SearchIcon width={16} height={16} />}
          title="Assign a course"
          subtitle={`Search real courses and give one to ${studentFirstName} in a click.`}
        />

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void runSearch(query);
          }}
        >
          <div className="relative flex-1">
            <SearchIcon
              width={16}
              height={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-2 pointer-events-none"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. SQL bootcamp"
              aria-label="Search courses"
              className={`${inputClass} w-full !pl-10 !py-2.5`}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary !px-5 !py-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={isSearching || query.trim().length < 2}
          >
            {isSearching ? "Searching…" : "Search"}
          </button>
        </form>

        {suggestedSearches.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-text-2 text-xs mr-0.5">
              {studentFirstName}'s gaps:
            </span>
            {suggestedSearches.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s);
                  void runSearch(s);
                }}
                className="rounded-full border border-border bg-white px-2.5 py-0.5 text-xs text-text hover:border-lime hover:text-lime hover:bg-lime/5 transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-xl bg-bg/70 border border-border px-3 py-2">
          <div className="flex items-center gap-2.5 flex-none">
            <span className="text-text-2 text-xs font-medium">Priority</span>
            <Segmented
              size="sm"
              label="Priority"
              options={PRIORITY_OPTIONS}
              value={priority}
              onChange={setPriority}
            />
          </div>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Note for ${studentFirstName} (optional)`}
            aria-label="Note for the student"
            className={`${inputClass} w-full !py-1.5 !text-sm`}
          />
        </div>

        {notice && (
          <div
            role="status"
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-teal/30 bg-teal/10 px-3.5 py-2 text-sm text-teal"
          >
            <CheckIcon width={15} height={15} className="flex-none" />
            <span className="min-w-0 break-words">{notice}</span>
          </div>
        )}
        {searchError && (
          <p className="mt-3 text-coral text-sm" role="alert">
            {searchError}
          </p>
        )}
      </div>

      {(isSearching || response) && (
        <div className="border-t border-border bg-bg/40 p-4 sm:p-5">
          {isSearching ? (
            <div
              className="rounded-2xl border border-border bg-white divide-y divide-border"
              aria-busy="true"
            >
              <ResultSkeleton />
              <ResultSkeleton />
              <ResultSkeleton />
            </div>
          ) : (
            response && (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-2.5">
                  <h3 className="text-[14px]">
                    {response.results.length === 0
                      ? `No catalog matches for "${searchedFor}"`
                      : `${response.results.length} courses for "${searchedFor}"`}
                  </h3>
                  {response.results.length > 0 && (
                    <span className="text-text-2 text-xs hidden sm:inline">
                      Click Assign to give it to {studentFirstName}
                    </span>
                  )}
                </div>

                {response.results.length === 0 ? (
                  <p className="text-text-2 text-sm mb-3">
                    Try different words, open one of the platforms below, or add
                    a course link yourself.
                  </p>
                ) : (
                  <ul className="rounded-2xl border border-border bg-white divide-y divide-border overflow-hidden">
                    {response.results.map((r) => {
                      const assigned = assignedUrls.has(r.url);
                      return (
                        <li
                          key={r.url}
                          className={`flex items-start gap-3 px-3.5 py-3 ${
                            assigned ? "bg-teal/5" : ""
                          }`}
                        >
                          {r.thumbnailUrl && (
                            <img
                              src={r.thumbnailUrl}
                              alt=""
                              className="w-[84px] h-[47px] rounded-lg object-cover flex-none"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Preview in a new tab"
                              className="text-[14px] font-semibold leading-snug hover:underline break-words"
                            >
                              {r.title}
                            </a>
                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <ProviderBadge provider={r.provider} />
                              {r.level && <LevelBadge level={r.level} />}
                              {r.durationMinutes !== null && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-text-2">
                                  <ClockIcon width={11} height={11} />
                                  {formatDuration(r.durationMinutes)}
                                </span>
                              )}
                              {r.provider === "YouTube" && r.author && (
                                <span className="text-[11px] text-text-2">
                                  {r.author}
                                </span>
                              )}
                            </div>
                            {r.description && (
                              <p className="text-text-2 text-xs leading-relaxed mt-1 line-clamp-2">
                                {r.description}
                              </p>
                            )}
                          </div>
                          <div className="flex-none flex flex-col items-end gap-1.5">
                            <button
                              type="button"
                              className={`btn btn-small inline-flex items-center gap-1.5 disabled:cursor-not-allowed ${
                                assigned
                                  ? "!bg-teal !border-teal !text-white"
                                  : "btn-primary"
                              } disabled:opacity-90`}
                              disabled={assigningUrl === r.url || assigned}
                              onClick={() => void assignResult(r)}
                            >
                              {assigned ? (
                                <>
                                  <CheckIcon width={13} height={13} /> Assigned
                                </>
                              ) : assigningUrl === r.url ? (
                                "Assigning…"
                              ) : (
                                <>
                                  <PlusIcon width={13} height={13} /> Assign
                                </>
                              )}
                            </button>
                            <a
                              href={r.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-text-2 hover:text-lime transition"
                            >
                              Preview <ExternalIcon width={10} height={10} />
                            </a>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-1.5 mt-3">
                  <span className="text-text-2 text-xs">Browse more on:</span>
                  {response.searchLinks.map((l) => (
                    <a
                      key={l.platform}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-2.5 py-0.5 text-xs hover:border-lime hover:text-lime transition"
                    >
                      {l.platform} <ExternalIcon width={10} height={10} />
                    </a>
                  ))}
                </div>
                {!response.youtubeEnabled && (
                  <p className="text-text-2 text-xs mt-2">
                    Live YouTube results aren't switched on yet, so YouTube
                    appears as a search link only.
                  </p>
                )}
              </>
            )
          )}
        </div>
      )}

      {aiModules.length > 0 && (
        <div className="border-t border-border px-4 sm:px-5 py-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <SparkIcon width={15} height={15} className="text-lime-ink" />
            <h3 className="text-[14px]">AI recommendations for {studentFirstName}</h3>
          </div>
          <ul className="divide-y divide-border">
            {aiModules.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-4 py-2"
              >
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium">
                    {m.title} <AtsBoostBadge points={m.atsBoost} />
                  </p>
                  <p className="text-text-2 text-xs">
                    {m.topic} · {m.estimatedHours}h · {m.priority} priority
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <button
                    type="button"
                    className="text-text-2 hover:text-lime text-xs px-2 py-1"
                    onClick={() => customizeModule(m)}
                  >
                    Customize
                  </button>
                  <button
                    type="button"
                    className="btn btn-small disabled:opacity-60"
                    disabled={assigningModule === m.id}
                    onClick={() => void assignModule(m)}
                  >
                    {assigningModule === m.id ? "Assigning…" : "Assign"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-border">
        <button
          type="button"
          onClick={() => setManualOpen((o) => !o)}
          aria-expanded={manualOpen}
          className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-bg/60 transition"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <PlusIcon width={15} height={15} className="text-lime" />
            Add a course by link
            <span className="text-text-2 text-xs font-normal hidden sm:inline">
              — Coursera, NPTEL, or anything you've found
            </span>
          </span>
          <span
            className={`text-text-2 text-xs transition-transform ${
              manualOpen ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>
        {manualOpen && (
          <div className="px-4 sm:px-5 pb-4 grid gap-2.5 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Course title"
              aria-label="Course title"
              className={`${inputClass} !py-2`}
            />
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Topic (e.g. SQL joins)"
              aria-label="Topic"
              className={`${inputClass} !py-2`}
            />
            <div className="sm:col-span-2 grid gap-2.5 sm:grid-cols-[90px_1fr_auto] items-center">
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                type="number"
                min="0.5"
                step="0.5"
                aria-label="Estimated hours"
                placeholder="Hours"
                className={`${inputClass} !py-2`}
              />
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Course link (optional)"
                aria-label="Course link"
                className={`${inputClass} !py-2`}
              />
              <button
                type="button"
                className="btn btn-primary !py-2 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isAssigningManual || !title.trim() || !topic.trim()}
                onClick={() => void assignManual()}
              >
                {isAssigningManual ? "Assigning…" : "Assign course"}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
