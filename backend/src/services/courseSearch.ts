import fetch from "node-fetch";
import { buildResources } from "./coursePlanGeneration";

export interface CourseSearchResult {
  provider: "Microsoft Learn" | "YouTube";
  kind: "learning path" | "module" | "video" | "playlist";
  title: string;
  url: string;
  description: string | null;
  author: string | null;
  thumbnailUrl: string | null;
  durationMinutes: number | null;
  level: string | null;
}

export interface CourseSearchResponse {
  results: CourseSearchResult[];
  youtubeEnabled: boolean;
  /** Platform search pages with no public API (Coursera, Udemy, ...): links only, never guessed course URLs. */
  searchLinks: { platform: string; url: string }[];
}

const MAX_RESULTS_PER_PROVIDER = 8;
const CATALOG_TTL_MS = 12 * 60 * 60 * 1000;
const RESPONSE_TTL_MS = 10 * 60 * 1000;
const MAX_CACHED_QUERIES = 200;

// Words that describe the *format* of a course rather than its subject, so
// "SQL bootcamp" searches for SQL instead of demanding the word "bootcamp".
const GENERIC_TERMS = new Set([
  "a", "an", "and", "the", "of", "to", "in", "for", "with", "on",
  "course", "courses", "bootcamp", "tutorial", "tutorials", "training",
  "learn", "learning", "class", "classes", "beginner", "beginners",
  "basics", "basic", "introduction", "intro", "full", "free", "complete",
  "crash", "masterclass", "certification",
]);

const BEGINNER_INTENT =
  /\b(bootcamp|beginners?|basics?|intro|introduction|fundamentals?|crash|learn)\b/i;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function queryTerms(query: string): string[] {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9#+.]+/)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
  const specific = tokens.filter((t) => !GENERIC_TERMS.has(t));
  return specific.length > 0 ? specific : tokens;
}

/** Whole-word match that tolerates plural/-ing endings ("join" matches "joins"). */
function termPattern(term: string): RegExp {
  const stem = term.length > 3 ? term.replace(/(ing|es|s)$/, "") : term;
  const maxSuffix = stem.length <= 3 ? 1 : 3;
  return new RegExp(
    `(?<![a-z0-9])${escapeRegExp(stem)}[a-z]{0,${maxSuffix}}(?![a-z0-9])`
  );
}

// --- Microsoft Learn: official, keyless catalog API -----------------------

interface CatalogItem {
  title: string;
  titleLower: string;
  summary: string;
  summaryLower: string;
  url: string;
  kind: "learning path" | "module";
  durationMinutes: number | null;
  level: string | null;
  popularity: number;
}

let catalog: { at: number; items: CatalogItem[] } | null = null;
let catalogLoad: Promise<CatalogItem[]> | null = null;

function stripTracking(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.search = "";
  return url.toString();
}

async function loadCatalog(): Promise<CatalogItem[]> {
  const res = await fetch(
    "https://learn.microsoft.com/api/catalog/?type=modules,learningPaths&locale=en-us",
    { timeout: 30000 }
  );
  if (!res.ok) throw new Error(`Microsoft Learn catalog failed: ${res.status}`);
  const data = (await res.json()) as {
    modules?: any[];
    learningPaths?: any[];
  };

  const toItem = (raw: any, kind: CatalogItem["kind"]): CatalogItem | null => {
    if (typeof raw?.title !== "string" || typeof raw?.url !== "string") return null;
    let url: string;
    try {
      url = stripTracking(raw.url);
    } catch {
      return null;
    }
    const summary = typeof raw.summary === "string" ? raw.summary : "";
    return {
      title: raw.title,
      titleLower: raw.title.toLowerCase(),
      summary,
      summaryLower: summary.toLowerCase(),
      url,
      kind,
      durationMinutes:
        typeof raw.duration_in_minutes === "number" ? raw.duration_in_minutes : null,
      level: Array.isArray(raw.levels) && raw.levels[0] ? String(raw.levels[0]) : null,
      popularity: typeof raw.popularity === "number" ? raw.popularity : 0,
    };
  };

  const items: CatalogItem[] = [];
  for (const raw of data.learningPaths ?? []) {
    const item = toItem(raw, "learning path");
    if (item) items.push(item);
  }
  for (const raw of data.modules ?? []) {
    const item = toItem(raw, "module");
    if (item) items.push(item);
  }
  return items;
}

async function getCatalog(): Promise<CatalogItem[]> {
  if (catalog && Date.now() - catalog.at < CATALOG_TTL_MS) return catalog.items;
  if (!catalogLoad) {
    catalogLoad = loadCatalog()
      .then((items) => {
        catalog = { at: Date.now(), items };
        return items;
      })
      .finally(() => {
        catalogLoad = null;
      });
  }
  try {
    return await catalogLoad;
  } catch (err) {
    // A stale catalog beats no results.
    if (catalog) return catalog.items;
    throw err;
  }
}

async function searchMicrosoftLearn(query: string): Promise<CourseSearchResult[]> {
  const patterns = queryTerms(query).map(termPattern);
  if (patterns.length === 0) return [];
  const items = await getCatalog();
  const wantsBeginner = BEGINNER_INTENT.test(query);

  const scored: { item: CatalogItem; score: number }[] = [];
  for (const item of items) {
    let titleHits = 0;
    let summaryHits = 0;
    for (const p of patterns) {
      if (p.test(item.titleLower)) titleHits++;
      else if (p.test(item.summaryLower)) summaryHits++;
    }
    if (titleHits === 0) continue;
    const coversEveryTerm = titleHits + summaryHits === patterns.length ? 4 : 0;
    const pathBonus = item.kind === "learning path" ? 1 : 0;
    const levelBonus = wantsBeginner && item.level === "beginner" ? 2 : 0;
    scored.push({
      item,
      score: titleHits * 3 + summaryHits + coversEveryTerm + pathBonus + levelBonus,
    });
  }
  scored.sort((a, b) => b.score - a.score || b.item.popularity - a.item.popularity);

  return scored.slice(0, MAX_RESULTS_PER_PROVIDER).map(({ item }) => ({
    provider: "Microsoft Learn",
    kind: item.kind,
    title: item.title,
    url: item.url,
    description: item.summary || null,
    author: "Microsoft",
    thumbnailUrl: null,
    durationMinutes: item.durationMinutes,
    level: item.level,
  }));
}

// --- YouTube: official Data API v3, needs YOUTUBE_API_KEY -----------------

export function isYouTubeEnabled(): boolean {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(Number(code)));
}

async function searchYouTube(query: string): Promise<CourseSearchResult[]> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video,playlist",
    maxResults: "6",
    q: query,
    safeSearch: "strict",
    relevanceLanguage: "en",
    key: process.env.YOUTUBE_API_KEY!,
  });
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, {
    timeout: 8000,
  });
  if (!res.ok) {
    throw new Error(`YouTube search failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { items?: any[] };

  const results: CourseSearchResult[] = [];
  for (const item of data.items ?? []) {
    const videoId = item?.id?.videoId;
    const playlistId = item?.id?.playlistId;
    if (!videoId && !playlistId) continue;
    const snippet = item.snippet ?? {};
    const thumb = snippet.thumbnails?.medium?.url ?? snippet.thumbnails?.default?.url;
    results.push({
      provider: "YouTube",
      kind: playlistId ? "playlist" : "video",
      title: decodeEntities(String(snippet.title ?? "Untitled")),
      url: playlistId
        ? `https://www.youtube.com/playlist?list=${playlistId}`
        : `https://www.youtube.com/watch?v=${videoId}`,
      description: snippet.description ? decodeEntities(String(snippet.description)) : null,
      author: snippet.channelTitle ? decodeEntities(String(snippet.channelTitle)) : null,
      thumbnailUrl:
        typeof thumb === "string" && thumb.startsWith("https://i.ytimg.com/")
          ? thumb
          : null,
      durationMinutes: null,
      level: null,
    });
  }
  return results;
}

// --- Public entry point ---------------------------------------------------

const responseCache = new Map<string, { at: number; results: CourseSearchResult[] }>();

export async function searchCourses(query: string): Promise<CourseSearchResponse> {
  const cacheKey = query.toLowerCase().replace(/\s+/g, " ");
  const cached = responseCache.get(cacheKey);

  let results: CourseSearchResult[];
  if (cached && Date.now() - cached.at < RESPONSE_TTL_MS) {
    results = cached.results;
  } else {
    // YouTube search costs API quota, so results are cached per query.
    const [youtube, microsoft] = await Promise.allSettled([
      isYouTubeEnabled() ? searchYouTube(query) : Promise.resolve([]),
      searchMicrosoftLearn(query),
    ]);
    for (const outcome of [youtube, microsoft]) {
      if (outcome.status === "rejected") {
        console.warn("Course search provider failed:", outcome.reason);
      }
    }
    results = [
      ...(youtube.status === "fulfilled" ? youtube.value : []),
      ...(microsoft.status === "fulfilled" ? microsoft.value : []),
    ];
    // Don't cache an all-failed lookup, so a transient outage isn't sticky.
    if (results.length > 0) {
      if (responseCache.size >= MAX_CACHED_QUERIES) {
        const oldest = responseCache.keys().next().value;
        if (oldest !== undefined) responseCache.delete(oldest);
      }
      responseCache.set(cacheKey, { at: Date.now(), results });
    }
  }

  return {
    results,
    youtubeEnabled: isYouTubeEnabled(),
    searchLinks: buildResources(query).map((r) => ({
      platform: r.platform,
      url: r.url,
    })),
  };
}

// --- Validation for resources chosen by faculty ---------------------------

export interface ChosenResource {
  platform: string;
  type: string;
  url: string;
  title?: string;
}

/** Faculty-chosen links are shown to students, so only plain http(s) URLs are accepted. Returns null if anything is malformed. */
export function parseChosenResources(input: unknown): ChosenResource[] | null {
  if (!Array.isArray(input) || input.length > 6) return null;
  const out: ChosenResource[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    if (
      typeof r.platform !== "string" ||
      typeof r.type !== "string" ||
      typeof r.url !== "string"
    ) {
      return null;
    }
    if (r.title !== undefined && typeof r.title !== "string") return null;
    if (!r.platform.trim() || r.platform.length > 40 || r.type.length > 20) return null;
    if (r.url.length > 2000) return null;
    let parsed: URL;
    try {
      parsed = new URL(r.url);
    } catch {
      return null;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    out.push({
      platform: r.platform.trim(),
      type: r.type.trim(),
      url: parsed.toString(),
      ...(r.title?.trim() ? { title: r.title.trim().slice(0, 200) } : {}),
    });
  }
  return out;
}
