import fetch from "node-fetch";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import type { ParsedResume } from "../schemas/resume";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

const CombinedAnalysisSchema = z.object({
  primaryField: z.string(),
  secondaryFields: z.array(z.string()).default([]),
  seniority: z.string(),
  confidence: z.number().min(0).max(100),
  fieldReasoning: z.string(),
  relevantKeywords: z.array(z.string()).min(1),
  impactScore: z.number().min(0).max(25),
  impactReasoning: z.string(),
});

export type CombinedAnalysis = z.infer<typeof CombinedAnalysisSchema>;

interface RankedField {
  field: string;
  similarity: number;
}

async function classifyField(skills: string[]): Promise<RankedField[]> {
  const res = await fetch(`${ML_SERVICE_URL}/classify-field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ skills }),
  });
  if (!res.ok) {
    throw new Error(`classify-field failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { ranked: RankedField[] };
  return data.ranked;
}

const SYSTEM_PROMPT = `You are a career analyst and ATS resume reviewer. You are given a candidate's skills, job titles, experience bullets, and an embedding-similarity ranking against a SMALL fixed set of common tech/business fields. That ranking only covers a handful of fields (software engineering, data science, DevOps, product, marketing, design) -- it is NOT an exhaustive list. If the candidate is clearly in a different field entirely (e.g. healthcare, chemistry research, sales, education, law, skilled trades, finance, hospitality, etc.), ignore the ranking and name the candidate's REAL field directly. Never force-fit a candidate into one of the ranked fields if it doesn't genuinely match.

In a single response, do THREE things:

1. Field analysis: decide the primary field (in your own words, not limited to the ranking), 0-2 secondary fields, a seniority level (one of: Entry-level, Mid-level, Senior, Lead/Staff), a confidence percentage from 0-100, and a one-to-two sentence reasoning grounded in the actual resume content.

2. Relevant keywords: list 12-20 specific skills, tools, certifications, or terms a strong resume in the candidate's ACTUAL detected field AND seniority level would be expected to include (for ATS keyword matching) -- a Lead/Staff-level list should skew toward leadership/architecture terms, an Entry-level list toward fundamentals. Base this on the real field you detected, not the fixed ranking list.

3. Impact scoring: score the IMPACT and CLARITY of the candidate's experience bullet points on a 0-25 scale, built from three sub-criteria you must reason through explicitly before giving the final number:
   a. Quantification (up to ~10 pts worth of weight): are achievements backed by numbers, percentages, dollar amounts, or other concrete metrics, versus purely qualitative claims?
   b. Verb strength (up to ~8 pts worth of weight): do bullets lead with strong, specific action verbs ("architected", "reduced", "negotiated") versus weak/passive filler ("responsible for", "worked on", "helped with", "duties included")?
   c. Outcome framing (up to ~7 pts worth of weight): do bullets state the RESULT or business impact of the work, versus just describing the task/duty performed with no visible outcome?
   Weigh all three, note in impactReasoning which of the three is weakest, and derive the final 0-25 score from that combined assessment rather than a single holistic impression. If there are no bullets at all, score low.

Respond ONLY with JSON: {"primaryField": string, "secondaryFields": string[], "seniority": string, "confidence": number, "fieldReasoning": string, "relevantKeywords": string[], "impactScore": number, "impactReasoning": string}`;

export async function analyzeFieldAndImpact(
  resumeId: string,
  parsed: ParsedResume
): Promise<CombinedAnalysis> {
  const ranked = await classifyField(parsed.skills);

  const titles = parsed.experience
    .map((e) => `${e.title ?? "Unknown role"} at ${e.company ?? "unknown company"}`)
    .join("; ");
  const bullets = parsed.experience.flatMap((e) => e.bullets);

  const userPrompt = `Skills: ${parsed.skills.join(", ") || "none listed"}
Job titles: ${titles || "none listed"}
Number of experience entries: ${parsed.experience.length}
Embedding similarity ranking against a small fixed set of common fields (a signal only, not exhaustive -- the candidate may be in a completely different field):
${ranked.map((r) => `${r.field}: ${r.similarity.toFixed(3)}`).join("\n")}

Experience bullets:
${bullets.length ? bullets.map((b) => `- ${b}`).join("\n") : "(none)"}`;

  const result = await generateStructured(
    CombinedAnalysisSchema,
    SYSTEM_PROMPT,
    userPrompt
  );

  await prisma.analysis.create({
    data: {
      resumeId,
      detectedField: result.primaryField,
      secondaryFields: JSON.stringify(result.secondaryFields),
      seniority: result.seniority,
      confidence: result.confidence,
      reasoning: result.fieldReasoning,
    },
  });

  return result;
}
