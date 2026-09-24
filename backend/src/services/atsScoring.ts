import fetch from "node-fetch";
import { prisma } from "../lib/prisma";
import type { ParsedResume } from "../schemas/resume";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

interface RuleScores {
  formatting_score: number;
  keyword_score: number;
  structure_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
}

async function scoreRules(
  parsed: ParsedResume,
  relevantKeywords: string[]
): Promise<RuleScores> {
  const res = await fetch(`${ML_SERVICE_URL}/score-rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contact: parsed.contact,
      summary: parsed.summary,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      projects: parsed.projects,
      certifications: parsed.certifications,
      relevant_keywords: relevantKeywords,
    }),
  });
  if (!res.ok) {
    throw new Error(`score-rules failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<RuleScores>;
}

export async function scoreResume(
  resumeId: string,
  parsed: ParsedResume,
  relevantKeywords: string[],
  impactScore: number,
  impactReasoning: string
) {
  const rules = await scoreRules(parsed, relevantKeywords);

  const roundedImpact = Math.round(impactScore);
  const totalScore = Math.min(
    100,
    rules.formatting_score +
      rules.keyword_score +
      rules.structure_score +
      roundedImpact
  );

  await prisma.atsScore.create({
    data: {
      resumeId,
      totalScore,
      formattingScore: rules.formatting_score,
      keywordScore: rules.keyword_score,
      impactScore: roundedImpact,
      structureScore: rules.structure_score,
      breakdownJson: JSON.stringify({
        matchedKeywords: rules.matched_keywords,
        missingKeywords: rules.missing_keywords,
        impactReasoning,
      }),
    },
  });

  return { totalScore, ...rules, impactScore: roundedImpact };
}
