import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import type { ParsedResume } from "../schemas/resume";

const FixSuggestionItemSchema = z.object({
  section: z.string(),
  originalText: z.string(),
  suggestedText: z.string(),
});

const FixSuggestionsResponseSchema = z.object({
  suggestions: z.array(FixSuggestionItemSchema).max(6),
});

const SYSTEM_PROMPT = `You are a resume writing coach. You are given a candidate's experience bullets and their ATS review feedback (missing keywords, impact/clarity critique). Identify up to 6 bullets that are vague, passive, or lack a measurable outcome, and rewrite each into a stronger version.

Rules:
- Use strong action verbs and be specific about scope.
- If the original bullet has no quantifiable result, do NOT invent a fake number or statistic. Instead phrase the improvement with a placeholder like "[add specific metric, e.g. % improvement, number of users, time saved]" so the candidate fills in their own real number.
- Never fabricate facts, employers, tools, or outcomes not implied by the original text.
- Skip bullets that are already strong and specific -- only include ones that genuinely need improvement. It is fine to return zero suggestions if the resume is already strong.
- ONLY suggest fixes for bullets that appear in the list below. Never invent a bullet that isn't there.
- "originalText" must be copied EXACTLY as given, character for character, so it can be matched back to the source.
- "section" should identify which role the bullet is from (e.g. "Backend Engineer at Zylker Corp").

Respond ONLY with JSON: {"suggestions": [{"section": string, "originalText": string, "suggestedText": string}]}`;

export async function generateFixSuggestions(resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) {
    throw new Error("Resume not found.");
  }
  if (!resume.parsedJson) {
    throw new Error("Resume has not finished processing yet.");
  }
  const parsed = JSON.parse(resume.parsedJson) as ParsedResume;

  const atsScore = await prisma.atsScore.findFirst({
    where: { resumeId },
    orderBy: { createdAt: "desc" },
  });
  const breakdown = atsScore?.breakdownJson
    ? (JSON.parse(atsScore.breakdownJson) as {
        missingKeywords?: string[];
        impactReasoning?: string;
      })
    : null;

  // Only real, non-empty bullets are ever shown to the model, and every
  // suggestion it returns gets checked against this exact set afterward --
  // an LLM claiming "I copied this verbatim" is not proof that it did.
  const realBullets = new Set<string>();
  const bulletBlocks: string[] = [];
  for (const e of parsed.experience) {
    const label = `${e.title ?? "Unknown role"} at ${e.company ?? "unknown company"}`;
    const nonEmptyBullets = e.bullets.filter((b) => b.trim());
    if (nonEmptyBullets.length === 0) continue;
    for (const b of nonEmptyBullets) realBullets.add(b.trim());
    bulletBlocks.push(
      nonEmptyBullets.map((b) => `[${label}] ${b}`).join("\n")
    );
  }

  if (realBullets.size === 0) {
    await prisma.fixSuggestion.deleteMany({ where: { resumeId } });
    return [];
  }

  const userPrompt = `Experience bullets:
${bulletBlocks.join("\n")}
${breakdown?.impactReasoning ? `\nATS impact critique: ${breakdown.impactReasoning}` : ""}${
    breakdown?.missingKeywords?.length
      ? `\nMissing keywords: ${breakdown.missingKeywords.join(", ")}`
      : ""
  }`;

  const result = await generateStructured(
    FixSuggestionsResponseSchema,
    SYSTEM_PROMPT,
    userPrompt
  );

  const validSuggestions = result.suggestions.filter((s) => {
    const isReal = realBullets.has(s.originalText.trim());
    if (!isReal) {
      console.warn(
        `generateFixSuggestions: discarding suggestion whose originalText doesn't match any real bullet: ${JSON.stringify(s.originalText)}`
      );
    }
    return isReal;
  });

  await prisma.fixSuggestion.deleteMany({ where: { resumeId } });

  const created = await Promise.all(
    validSuggestions.map((s) =>
      prisma.fixSuggestion.create({
        data: {
          resumeId,
          section: s.section,
          originalText: s.originalText,
          suggestedText: s.suggestedText,
        },
      })
    )
  );

  return created;
}
