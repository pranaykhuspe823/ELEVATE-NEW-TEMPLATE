import type { AtsScore } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Must match the keyword weight in ml-service/app/routers/score.py (score_rules).
const KEYWORD_MAX = 30;

export interface AtsBaseline {
  totalScore: number;
  /** formatting + impact + structure: everything a new keyword can't move. */
  nonKeywordScore: number;
  matched: string[];
  missing: string[];
}

export interface AtsBoost {
  /** ATS points gained (the score is out of 100, so this is also the % gain). */
  points: number;
  projectedScore: number;
  /** The still-missing keywords that produce the gain. */
  keywords: string[];
}

export function baselineFromScore(score: AtsScore): AtsBaseline {
  let breakdown: { matchedKeywords?: unknown; missingKeywords?: unknown } = {};
  try {
    breakdown = JSON.parse(score.breakdownJson);
  } catch {
    // Treat a corrupt breakdown as "no keyword data" rather than failing the page.
  }
  const strings = (v: unknown) =>
    Array.isArray(v) ? v.filter((k): k is string => typeof k === "string") : [];
  return {
    totalScore: score.totalScore,
    nonKeywordScore: score.formattingScore + score.impactScore + score.structureScore,
    matched: strings(breakdown.matchedKeywords),
    missing: strings(breakdown.missingKeywords),
  };
}

/** The ATS score of a student's latest resume -- the same one faculty see. */
export async function latestAtsBaseline(userId: string): Promise<AtsBaseline | null> {
  const resume = await prisma.resume.findFirst({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  if (!resume) return null;
  const score = await prisma.atsScore.findFirst({
    where: { resumeId: resume.id },
    orderBy: { createdAt: "desc" },
  });
  return score ? baselineFromScore(score) : null;
}

/** Python's round(): halves go to the even neighbour, unlike Math.round. */
function pyRound(x: number): number {
  const floor = Math.floor(x);
  if (Math.abs(x - floor - 0.5) < 1e-9) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(x);
}

/** What the ATS score becomes once `keywords` appear on the resume, using the
 * same keyword formula score-rules does -- so the number is exact (given
 * nothing else on the resume changes), not an estimate. Keywords the resume
 * already has don't count. */
export function atsBoost(baseline: AtsBaseline, keywords: string[]): AtsBoost {
  const missing = new Map(baseline.missing.map((k) => [k.toLowerCase(), k]));
  const gained = Array.from(new Set(keywords.map((k) => k.toLowerCase())))
    .filter((k) => missing.has(k))
    .map((k) => missing.get(k)!);
  const total = baseline.matched.length + baseline.missing.length;
  if (total === 0 || gained.length === 0) {
    return { points: 0, projectedScore: baseline.totalScore, keywords: [] };
  }
  const keywordScore = Math.min(
    pyRound(((baseline.matched.length + gained.length) / total) * KEYWORD_MAX),
    KEYWORD_MAX
  );
  const projectedScore = Math.max(
    baseline.totalScore,
    Math.min(100, baseline.nonKeywordScore + keywordScore)
  );
  return { points: projectedScore - baseline.totalScore, projectedScore, keywords: gained };
}

export function parseKeywords(json: string): string[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/** Only keywords that really are on the missing list (an LLM can drift), in the list's own spelling. */
export function pickMissing(raw: string[], missing: string[]): string[] {
  const lookup = new Map(missing.map((k) => [k.toLowerCase().trim(), k]));
  return Array.from(
    new Set(raw.map((k) => lookup.get(k.toLowerCase().trim())).filter((k): k is string => !!k))
  );
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Missing keywords named outright in a course's title/topic -- covers courses
 * nobody tagged (written by faculty) and anything the LLM forgot to tag. */
export function keywordsInText(text: string, missing: string[]): string[] {
  const lower = text.toLowerCase();
  return missing.filter((k) =>
    new RegExp(`(?<![a-z0-9])${escapeRegExp(k.toLowerCase().trim())}(?![a-z0-9])`).test(lower)
  );
}
