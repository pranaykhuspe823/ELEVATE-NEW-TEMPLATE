import { useState } from "react";
import { api } from "../../lib/api";
import { ExternalIcon, SearchIcon } from "../faculty/icons";
import { ProviderBadge } from "../faculty/ui";
import { formatDuration, type CourseSearchResponse, type CourseSearchResult } from "../faculty/types";

/** "Find free courses" for one missing skill: fetched on demand, top few shown. */
export default function GapCourses({ skill }: { skill: string }) {
  const [results, setResults] = useState<CourseSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    setFailed(false);
    try {
      const { data } = await api.get<CourseSearchResponse>("/api/drives/course-search", {
        params: { q: `${skill} tutorial` },
      });
      setResults(data.results.slice(0, 3));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !results && !loading) void load();
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-lime hover:underline"
      >
        <SearchIcon width={12} height={12} />
        {open ? "Hide courses" : "Find free courses"}
      </button>

      {open && (
        <div className="mt-2 rounded-xl border border-border bg-bg/70">
          {loading && <p className="px-3 py-2.5 text-xs text-text-2">Searching…</p>}
          {failed && !loading && (
            <p className="px-3 py-2.5 text-xs text-coral">
              Couldn't search right now.{" "}
              <button type="button" className="underline font-medium" onClick={() => void load()}>
                Try again
              </button>
            </p>
          )}
          {results && results.length === 0 && (
            <p className="px-3 py-2.5 text-xs text-text-2">No courses found for “{skill}”.</p>
          )}
          {results && results.length > 0 && (
            <ul className="divide-y divide-border">
              {results.map((r) => (
                <li key={r.url} className="px-3 py-2.5">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1.5 text-[13px] font-medium text-text hover:text-lime no-underline"
                  >
                    <span className="break-words">{r.title}</span>
                    <ExternalIcon width={11} height={11} className="flex-none mt-1" />
                  </a>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <ProviderBadge provider={r.provider} />
                    {r.durationMinutes != null && (
                      <span className="text-[11px] text-text-2">{formatDuration(r.durationMinutes)}</span>
                    )}
                    {r.author && <span className="text-[11px] text-text-3">{r.author}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
