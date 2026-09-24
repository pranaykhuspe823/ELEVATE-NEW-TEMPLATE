import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import {
  RESUME_JSON_SCHEMA_DESCRIPTION,
  ResumeSchema,
} from "../schemas/resume";
import { analyzeFieldAndImpact } from "./fieldAnalysis";
import { scoreResume } from "./atsScoring";
import { checkPlagiarism } from "./plagiarismCheck";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

async function extractText(filePath: string, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath), filename);
  const res = await fetch(`${ML_SERVICE_URL}/extract-text`, {
    method: "POST",
    body: form as any,
    headers: form.getHeaders(),
  });
  if (!res.ok) {
    throw new Error(`Text extraction failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { text: string };
  return data.text;
}

const STRUCTURE_SYSTEM_PROMPT = `You are a resume parser. Extract structured data from raw resume text and output ONLY valid JSON matching this exact schema:
${RESUME_JSON_SCHEMA_DESCRIPTION}
Do not include any text outside the JSON object. Do not invent information that isn't in the resume. Use null for missing scalar fields and [] for missing lists.`;

export async function processResume(
  resumeId: string,
  filePath: string,
  filename: string
) {
  try {
    const text = await extractText(filePath, filename);

    const parsed = await generateStructured(
      ResumeSchema,
      STRUCTURE_SYSTEM_PROMPT,
      `Resume text:\n\n${text}`,
      { provider: "groq" }
    );

    await prisma.resume.update({
      where: { id: resumeId },
      data: { parsedJson: JSON.stringify(parsed) },
    });

    await Promise.all([
      (async () => {
        const analysis = await analyzeFieldAndImpact(resumeId, parsed);
        await scoreResume(
          resumeId,
          parsed,
          analysis.relevantKeywords,
          analysis.impactScore,
          analysis.impactReasoning
        );
      })(),
      checkPlagiarism(resumeId, parsed),
    ]);

    await prisma.resume.update({
      where: { id: resumeId },
      data: { status: "ready" },
    });
  } catch (err) {
    console.error(`Failed to process resume ${resumeId}:`, err);
    await prisma.resume
      .update({
        where: { id: resumeId },
        data: { status: "failed", processingError: (err as Error).message },
      })
      .catch(() => {});
  }
}
