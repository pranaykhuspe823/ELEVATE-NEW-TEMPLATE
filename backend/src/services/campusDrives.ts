import fetch from "node-fetch";
import { z } from "zod";
import type { CampusDrive } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import type { ParsedResume } from "../schemas/resume";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

// Matches the ML service's own cap (ml-service/app/routers/match.py) and the
// frontend's skill editor.
const MAX_SKILLS = 40;
const MAX_SKILL_LENGTH = 60;

export class MatchServiceError extends Error {}

export interface Tips {
  gaps: { skill: string; advice: string }[];
  resumeTips: string[];
}

export interface Fit {
  score: number;
  matched: string[];
  missing: string[];
  tips: Tips | null;
}

export function toDriveDto(d: CampusDrive) {
  return {
    id: d.id,
    companyName: d.companyName,
    roleTitle: d.roleTitle,
    description: d.description,
    skills: parseSkills(d.skillsJson),
    driveDate: d.driveDate,
    location: d.location,
    ctc: d.ctc,
    status: d.status,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export function parseSkills(json: string): string[] {
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

/** A skill with an unmatched "(" or ")" is a leftover fragment from a
 * naive comma-split of something like "AWS (EC2, S3)" (producing "AWS (EC2"
 * and "S3)"). The frontend's paste parser avoids creating these, but this is
 * a defensive backstop for any other path into this data (a direct API call,
 * or older rows saved before that parser existed). */
function stripUnbalancedParens(skill: string): string {
  const opens = (skill.match(/\(/g) || []).length;
  const closes = (skill.match(/\)/g) || []).length;
  if (opens === closes) return skill;
  return skill.replace(/[()]/g, "").replace(/\s+/g, " ").trim();
}

/** Trim, drop blanks and case-insensitive duplicates, cap the list and each item. */
export function cleanSkills(input: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const skill = stripUnbalancedParens(raw.replace(/\s+/g, " ").trim()).slice(0, MAX_SKILL_LENGTH);
    const key = skill.toLowerCase();
    if (!skill || seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

/** The parts of a resume where a skill can legitimately show up. Contact
 * details and dates are left out. */
export function resumeSearchText(parsed: ParsedResume): string {
  const parts: string[] = [];
  if (parsed.summary) parts.push(parsed.summary);
  parts.push(...parsed.skills, ...parsed.certifications);
  for (const exp of parsed.experience) {
    if (exp.title) parts.push(exp.title);
    parts.push(...exp.bullets);
  }
  for (const proj of parsed.projects) {
    if (proj.name) parts.push(proj.name);
    if (proj.description) parts.push(proj.description);
    parts.push(...proj.technologies);
  }
  for (const edu of parsed.education) {
    if (edu.degree) parts.push(edu.degree);
    if (edu.field) parts.push(edu.field);
  }
  return parts.join(". ");
}

export function scoreOf(matched: number, total: number): number {
  return total === 0 ? 0 : Math.round((matched / total) * 100);
}

/** Which of `skills` each resume demonstrates -- one batched call to the ML
 * service, which uses the same matcher as the ATS keyword score. */
export async function matchSkills(
  skills: string[],
  resumes: { id: string; text: string }[]
): Promise<Map<string, { matched: string[]; missing: string[] }>> {
  const results = new Map<string, { matched: string[]; missing: string[] }>();
  if (resumes.length === 0) return results;
  try {
    const res = await fetch(`${ML_SERVICE_URL}/match-skills`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills, resumes }),
      timeout: 60000,
    });
    if (!res.ok) {
      throw new Error(`match-skills failed: ${res.status} ${await res.text()}`);
    }
    for (const r of (await res.json()) as { id: string; matched: string[]; missing: string[] }[]) {
      results.set(r.id, { matched: r.matched, missing: r.missing });
    }
  } catch (err) {
    console.warn("Skill matching unavailable:", err);
    throw new MatchServiceError("Matching is unavailable right now. Please try again shortly.");
  }
  return results;
}

/** Latest parsed resume per user. */
export async function latestParsedResumes(
  userIds: string[]
): Promise<Map<string, { id: string; parsed: ParsedResume }>> {
  const out = new Map<string, { id: string; parsed: ParsedResume }>();
  if (userIds.length === 0) return out;
  const resumes = await prisma.resume.findMany({
    where: { userId: { in: userIds }, parsedJson: { not: null } },
    orderBy: { uploadedAt: "desc" },
    select: { id: true, userId: true, parsedJson: true },
  });
  for (const r of resumes) {
    if (out.has(r.userId) || !r.parsedJson) continue;
    try {
      out.set(r.userId, { id: r.id, parsed: JSON.parse(r.parsedJson) as ParsedResume });
    } catch {
      // A corrupt blob shouldn't take the whole list down; that student just has no fit.
    }
  }
  return out;
}

function fitFromRow(row: {
  score: number;
  matchedJson: string;
  missingJson: string;
  tipsJson: string | null;
}): Fit {
  let tips: Tips | null = null;
  if (row.tipsJson) {
    try {
      tips = JSON.parse(row.tipsJson) as Tips;
    } catch {
      tips = null;
    }
  }
  return {
    score: row.score,
    matched: parseSkills(row.matchedJson),
    missing: parseSkills(row.missingJson),
    tips,
  };
}

/** A resume's fit for one drive, cached. Recomputed when the drive was edited
 * after the cached fit (so changed skills take effect) -- a new resume is a
 * new resumeId, so it naturally misses the cache. */
export async function getFit(
  drive: CampusDrive,
  resume: { id: string; parsed: ParsedResume }
): Promise<Fit> {
  const cached = await prisma.driveFit.findUnique({
    where: { driveId_resumeId: { driveId: drive.id, resumeId: resume.id } },
  });
  if (cached && cached.driveUpdatedAt.getTime() === drive.updatedAt.getTime()) {
    return fitFromRow(cached);
  }

  const skills = parseSkills(drive.skillsJson);
  const result = (
    await matchSkills(skills, [{ id: resume.id, text: resumeSearchText(resume.parsed) }])
  ).get(resume.id);
  if (!result) throw new MatchServiceError("Matching is unavailable right now. Please try again shortly.");

  const data = {
    score: scoreOf(result.matched.length, skills.length),
    matchedJson: JSON.stringify(result.matched),
    missingJson: JSON.stringify(result.missing),
    tipsJson: null,
    driveUpdatedAt: drive.updatedAt,
  };
  const row = await prisma.driveFit.upsert({
    where: { driveId_resumeId: { driveId: drive.id, resumeId: resume.id } },
    update: data,
    create: { driveId: drive.id, resumeId: resume.id, ...data },
  });
  return fitFromRow(row);
}

// --- LLM helpers -----------------------------------------------------------

const SkillsSchema = z.object({ skills: z.array(z.string()) });

const EXTRACT_SYSTEM_PROMPT = `You extract the concrete, checkable skills a job description requires: programming languages, frameworks, libraries, tools, databases, cloud platforms, methodologies, and key technical concepts. Output ONLY JSON: {"skills": string[]}. At most 20 short items (1-4 words each), written as canonical names (e.g. "Node.js", "SQL", "REST APIs", "Data Structures"). Each item is ONE standalone technology -- never a parenthetical or comma-separated group (write "AWS", "EC2", "S3" as three separate items, not "AWS (EC2, S3)"). No soft skills, no degree or experience-length requirements, no duplicates.`;

export async function extractSkillsFromDescription(description: string): Promise<string[]> {
  const result = await generateStructured(
    SkillsSchema,
    EXTRACT_SYSTEM_PROMPT,
    `Job description:\n\n${description.slice(0, 6000)}`
  );
  return cleanSkills(result.skills).slice(0, 20);
}

const SuggestionSchema = z.object({
  description: z.string(),
  techStack: z.array(z.string()),
});

const SUGGEST_SYSTEM_PROMPT = `You help a college placement officer prepare a campus-hiring post. Given a company and a role title (and optionally a description they have already written), you draft a job description and suggest the technology stack for the role. Output ONLY JSON: {"description": string, "techStack": string[]}.
- "description": a realistic entry-level / fresher job description of 90-160 words in plain text: one short intro sentence, then "Responsibilities:" with 3-4 lines starting "- ", then "Requirements:" with 3-4 lines starting "- ". Name the concrete technologies in the requirements.
- "techStack": 8-15 canonical skill names (languages, frameworks, databases, tools, key concepts such as "Data Structures") that this role typically needs, most important first. Each item is ONE standalone technology -- never a parenthetical or comma-separated group (write "AWS", "EC2", "S3" as three separate items, not "AWS (EC2, S3)"). If the officer already wrote a description, include what it mentions and add the commonly expected ones it leaves out.
- Do NOT invent facts about the company (its products, size, culture), salary, location, or dates — the intro sentence should only name the company and role. No soft skills or degree requirements in techStack.`;

/** Models often return the bulleted layout flattened onto one line; restore
 * the line breaks, and swap typographic hyphens for plain ones. */
function tidyDescription(text: string): string {
  let out = text.replace(/[‐‑]/g, "-").trim();
  if (!/\n\s*-\s/.test(out)) {
    out = out
      .replace(/\s*(Responsibilities:|Requirements:)\s*/g, "\n\n$1\n")
      .replace(/\s+-\s+(?=[A-Z])/g, "\n- ");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

export interface RoleSuggestion {
  description: string;
  techStack: string[];
}

export async function suggestForRole(
  companyName: string | undefined,
  roleTitle: string,
  existingDescription: string | undefined
): Promise<RoleSuggestion> {
  const result = await generateStructured(
    SuggestionSchema,
    SUGGEST_SYSTEM_PROMPT,
    `Company: ${companyName || "(not given)"}\nRole: ${roleTitle}\n\nDescription already written by the officer:\n${
      existingDescription?.trim() ? existingDescription.slice(0, 3000) : "(none)"
    }`
  );
  return {
    description: tidyDescription(result.description).slice(0, 3000),
    techStack: cleanSkills(result.techStack).slice(0, 15),
  };
}

const TipsSchema = z.object({
  gaps: z
    .array(z.object({ skill: z.string(), advice: z.string() }))
    .max(8)
    .default([]),
  resumeTips: z.array(z.string()).max(6).default([]),
});

const TIPS_SYSTEM_PROMPT = `You are a placement coach helping a college student prepare for a specific company's campus drive. You get the job description, the skills the student's resume does NOT yet show, and a brief of their resume. Output ONLY JSON: {"gaps": [{"skill": string, "advice": string}], "resumeTips": string[]}.
- "gaps": one entry per missing skill (at most 8, most important first). "advice" is 1-2 sentences: what to learn and a concrete small project or way to show it. Be specific and realistic for a student.
- "resumeTips": 3-5 concrete edits that would make THIS resume read better for THIS role (which existing strengths to lead with, what to reword or quantify). Never invent experience the student doesn't have.`;

function resumeBrief(p: ParsedResume): string {
  const bullets = p.experience.flatMap((e) => e.bullets).slice(0, 10);
  const projects = p.projects
    .slice(0, 4)
    .map((pr) => `${pr.name ?? "Project"}: ${(pr.description ?? "").slice(0, 200)}`);
  return [
    `Skills listed: ${p.skills.slice(0, 40).join(", ") || "none"}`,
    `Experience bullets: ${bullets.join(" | ") || "none"}`,
    `Projects: ${projects.join(" | ") || "none"}`,
    `Certifications: ${p.certifications.join(", ") || "none"}`,
  ].join("\n");
}

export async function generateTips(
  drive: CampusDrive,
  parsed: ParsedResume,
  missing: string[]
): Promise<Tips> {
  const tips = await generateStructured(
    TipsSchema,
    TIPS_SYSTEM_PROMPT,
    `Company: ${drive.companyName}\nRole: ${drive.roleTitle}\n\nJob description:\n${drive.description.slice(0, 3000)}\n\nSkills the resume does not yet show: ${
      missing.join(", ") || "(none)"
    }\n\nStudent resume brief:\n${resumeBrief(parsed)}`
  );
  return { gaps: tips.gaps, resumeTips: tips.resumeTips };
}
