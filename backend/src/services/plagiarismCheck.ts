import fetch from "node-fetch";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import type { ParsedResume } from "../schemas/resume";
import { z } from "zod";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

/** Similarity score (0-1) at or above which a pair is flagged as a likely copy. */
export const PLAGIARISM_SIMILARITY_THRESHOLD = 0.75;

/** Store at most this many matches per resume, highest similarity first. */
const MAX_STORED_MATCHES = 3;

/** Word-sequence length used for shingling. */
const SHINGLE_SIZE = 6;

/** A bullet/sentence counts as a semantic match at or above this cosine similarity. */
const SEMANTIC_UNIT_THRESHOLD = 0.85;

/** Bullets/sentences shorter than this are too generic to compare by meaning. */
const MIN_UNIT_WORDS = 5;

/** Embedding cost grows with corpus size, so semantic matching only covers the most recent resumes. */
const MAX_SEMANTIC_CANDIDATES = 200;

export interface OverlapPair {
  yours: string;
  theirs: string;
  similarity: number;
}

/**
 * Reduces a parsed resume to the free-text content worth comparing across
 * students -- summary, skills, experience bullets, project descriptions and
 * technologies, certifications. Deliberately excludes contact info, names,
 * company/institution names, and dates: those routinely match between
 * unrelated students (same college, same internship program) without
 * indicating copying.
 */
export function normalizeResumeText(parsed: ParsedResume): string {
  const parts: string[] = [];
  if (parsed.summary) parts.push(parsed.summary);
  parts.push(...parsed.skills);
  for (const exp of parsed.experience) parts.push(...exp.bullets);
  for (const edu of parsed.education) if (edu.field) parts.push(edu.field);
  for (const proj of parsed.projects) {
    if (proj.description) parts.push(proj.description);
    parts.push(...proj.technologies);
  }
  parts.push(...parsed.certifications);

  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b\d{1,4}\b/g, " ") // drop stray numeric tokens (years, phone/date fragments)
    .replace(/\s+/g, " ")
    .trim();
}

/** Sentence-sized pieces of prose (summary, bullets, project descriptions) for meaning-based comparison. Skill lists are excluded: single terms are near-identical across every student. */
export function extractComparableUnits(parsed: ParsedResume): string[] {
  const units: string[] = [];
  if (parsed.summary) units.push(...parsed.summary.split(/(?<=[.!?])\s+/));
  for (const exp of parsed.experience) units.push(...exp.bullets);
  for (const proj of parsed.projects) {
    if (proj.description) units.push(...proj.description.split(/(?<=[.!?])\s+/));
  }
  return units
    .map((u) => u.trim())
    .filter((u) => u.split(/\s+/).length >= MIN_UNIT_WORDS);
}

function shingle(text: string, size: number): Set<string> {
  const words = text.split(" ").filter(Boolean);
  const set = new Set<string>();
  if (words.length === 0) return set;
  if (words.length < size) {
    set.add(words.join(" "));
    return set;
  }
  for (let i = 0; i <= words.length - size; i++) {
    set.add(words.slice(i, i + size).join(" "));
  }
  return set;
}

export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const s of a) {
    if (b.has(s)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** A user's collegeId if set directly, else via their linked faculty. Null if neither applies. */
export async function resolveCollegeId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { collegeId: true, facultyId: true },
  });
  if (!user) return null;
  if (user.collegeId) return user.collegeId;
  if (!user.facultyId) return null;
  const faculty = await prisma.user.findUnique({
    where: { id: user.facultyId },
    select: { collegeId: true },
  });
  return faculty?.collegeId ?? null;
}

interface SemanticResult {
  id: string;
  score: number;
  matches: { a_index: number; b_index: number; similarity: number }[];
}

/** Falls back to an empty map (lexical-only detection) if the ML service can't embed, rather than failing the whole resume. */
async function semanticSimilarity(
  units: string[],
  candidates: { id: string; units: string[] }[]
): Promise<Map<string, SemanticResult>> {
  const results = new Map<string, SemanticResult>();
  if (units.length === 0 || candidates.length === 0) return results;
  try {
    const res = await fetch(`${ML_SERVICE_URL}/semantic-similarity`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        units,
        candidates,
        unit_threshold: SEMANTIC_UNIT_THRESHOLD,
      }),
    });
    if (!res.ok) {
      throw new Error(`semantic-similarity failed: ${res.status} ${await res.text()}`);
    }
    for (const r of (await res.json()) as SemanticResult[]) results.set(r.id, r);
  } catch (err) {
    console.warn(
      "Semantic plagiarism check unavailable, using lexical similarity only:",
      err
    );
  }
  return results;
}

const ExplanationSchema = z.object({ explanation: z.string() });

const EXPLANATION_SYSTEM_PROMPT = `You review pairs of college students' resumes for suspicious textual overlap suggesting one copied from the other. You are given two normalized excerpts (contact info, names, and dates already stripped out), and possibly the closest matching bullet pairs. In 2-3 sentences, describe specifically what overlaps -- e.g. near-identical bullet phrasing, the same project description, or the same achievement claims worded almost the same way. Be factual and specific. Do not speculate about intent or name anyone. Output ONLY JSON: {"explanation": string}.`;

async function explainOverlap(
  textA: string,
  textB: string,
  overlap: OverlapPair[]
): Promise<string> {
  const pairs = overlap.length
    ? `\n\nClosest matching bullet pairs:\n${overlap
        .map((p, i) => `${i + 1}. A: ${p.yours}\n   B: ${p.theirs}`)
        .join("\n")}`
    : "";
  const result = await generateStructured(
    ExplanationSchema,
    EXPLANATION_SYSTEM_PROMPT,
    `Resume A excerpt:\n${textA.slice(0, 4000)}\n\nResume B excerpt:\n${textB.slice(0, 4000)}${pairs}`
  );
  return result.explanation;
}

interface ScoredCandidate {
  resumeId: string;
  userId: string;
  score: number;
  text: string;
  overlap: OverlapPair[];
}

/**
 * Compares this resume against other students' resumes (same college when
 * one can be determined via the student's linked faculty, otherwise every
 * resume in the DB). Each pair's score is the higher of shingled-ngram
 * Jaccard (verbatim copying) and embedding-based bullet coverage (reworded
 * copying). The highest score across all candidates is saved on the resume;
 * the top matches at or above PLAGIARISM_SIMILARITY_THRESHOLD -- one per
 * student -- are stored, and only those get an LLM-generated explanation,
 * since running that per-pair across the whole corpus wouldn't be worth the
 * cost.
 */
export async function checkPlagiarism(
  resumeId: string,
  parsed: ParsedResume
): Promise<void> {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) return;

  const myText = normalizeResumeText(parsed);
  const myShingles = shingle(myText, SHINGLE_SIZE);
  const myUnits = extractComparableUnits(parsed);

  // Clear any previous run's matches (e.g. this resume was reprocessed).
  await prisma.plagiarismCheck.deleteMany({ where: { resumeId } });

  const collegeId = await resolveCollegeId(resume.userId);
  const scopedUserIds = collegeId
    ? (
        await prisma.user.findMany({
          where: { OR: [{ collegeId }, { faculty: { collegeId } }] },
          select: { id: true },
        })
      ).map((u) => u.id)
    : null;

  const candidates = myShingles.size === 0
    ? []
    : await prisma.resume.findMany({
        where: {
          id: { not: resumeId },
          userId: scopedUserIds
            ? { not: resume.userId, in: scopedUserIds }
            : { not: resume.userId },
          parsedJson: { not: null },
        },
        orderBy: { uploadedAt: "desc" },
        select: { id: true, userId: true, parsedJson: true },
      });

  const prepared: {
    id: string;
    userId: string;
    text: string;
    shingles: Set<string>;
    units: string[];
  }[] = [];
  for (const candidate of candidates) {
    if (!candidate.parsedJson) continue;
    let candidateParsed: ParsedResume;
    try {
      candidateParsed = JSON.parse(candidate.parsedJson);
    } catch {
      continue;
    }
    const text = normalizeResumeText(candidateParsed);
    prepared.push({
      id: candidate.id,
      userId: candidate.userId,
      text,
      shingles: shingle(text, SHINGLE_SIZE),
      units: extractComparableUnits(candidateParsed),
    });
  }

  const semantic = await semanticSimilarity(
    myUnits,
    prepared
      .filter((c) => c.units.length > 0)
      .slice(0, MAX_SEMANTIC_CANDIDATES)
      .map((c) => ({ id: c.id, units: c.units }))
  );

  const scored: ScoredCandidate[] = prepared.map((c) => {
    const lexical = jaccardSimilarity(myShingles, c.shingles);
    const sem = semantic.get(c.id);
    return {
      resumeId: c.id,
      userId: c.userId,
      score: Math.max(lexical, sem?.score ?? 0),
      text: c.text,
      overlap: (sem?.matches ?? []).map((m) => ({
        yours: myUnits[m.a_index],
        theirs: c.units[m.b_index],
        similarity: m.similarity,
      })),
    };
  });
  scored.sort((a, b) => b.score - a.score);

  // A student who re-uploaded shouldn't fill every slot with their own versions.
  const seenUsers = new Set<string>();
  const bestPerStudent = scored.filter((c) => {
    if (seenUsers.has(c.userId)) return false;
    seenUsers.add(c.userId);
    return true;
  });

  const flagged = bestPerStudent
    .filter((c) => c.score >= PLAGIARISM_SIMILARITY_THRESHOLD)
    .slice(0, MAX_STORED_MATCHES);

  for (const match of flagged) {
    let explanation: string | null = null;
    try {
      explanation = await explainOverlap(myText, match.text, match.overlap);
    } catch (err) {
      console.error(
        `Plagiarism explanation failed for resume ${resumeId} vs ${match.resumeId}:`,
        err
      );
    }
    await prisma.plagiarismCheck.create({
      data: {
        resumeId,
        matchedResumeId: match.resumeId,
        similarityScore: match.score,
        explanation,
        overlapJson: match.overlap.length ? JSON.stringify(match.overlap) : null,
        source: "internal",
      },
    });
  }

  await prisma.resume.update({
    where: { id: resumeId },
    data: { plagiarismScore: bestPerStudent[0]?.score ?? 0 },
  });
}
