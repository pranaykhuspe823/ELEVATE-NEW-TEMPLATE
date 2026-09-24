import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import { FIELD_TOPICS, QUESTION_BANK, SeedQuestion } from "../data/questionBank";
import { generateCodingQuestions } from "./codingQuestionGeneration";
import type { AnyQuestion } from "../schemas/codingQuestion";

const CANONICAL_FIELD_KEYS = Object.keys(FIELD_TOPICS);
const MCQ_TARGET_MAX = 12;

const CODING_RELEVANT_KEYWORDS = [
  "software",
  "engineer",
  "developer",
  "programmer",
  "backend",
  "back-end",
  "frontend",
  "front-end",
  "full stack",
  "fullstack",
  "data scientist",
  "data science",
  "devops",
  "site reliability",
  " sre",
  "machine learning",
  "ml engineer",
  "computer science",
  "coding",
  "systems engineer",
];

function isCodingRelevantField(field: string): boolean {
  const lower = ` ${field.toLowerCase()} `;
  return CODING_RELEVANT_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Returns the matching canonical field key, or null if the resume's
 * detected field doesn't genuinely match any of the ones we have a
 * hand-written question bank for. */
function matchCanonicalField(field: string): string | null {
  const lower = field.toLowerCase();
  const exact = CANONICAL_FIELD_KEYS.find((k) => k.toLowerCase() === lower);
  if (exact) return exact;
  return (
    CANONICAL_FIELD_KEYS.find(
      (k) => lower.includes(k.toLowerCase()) || k.toLowerCase().includes(lower)
    ) ?? null
  );
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Returns every hand-written seed question for the field's matched topics
 * (uncapped). Only used as a fallback when LLM generation comes back too
 * thin -- see buildMcqQuestions. */
export function selectSeedQuestions(
  canonicalField: string,
  skills: string[]
): SeedQuestion[] {
  const topics = FIELD_TOPICS[canonicalField];
  const skillsLower = skills.map((s) => s.toLowerCase());

  let matchedTopics = topics.filter((t) =>
    t.triggerSkills.some((trigger) =>
      skillsLower.some((s) => s.includes(trigger) || trigger.includes(s))
    )
  );
  if (matchedTopics.length === 0) matchedTopics = topics;

  const selected: SeedQuestion[] = [];
  for (const topicDef of matchedTopics) {
    const pool = QUESTION_BANK.filter(
      (q) => q.field === canonicalField && q.topic === topicDef.topic
    );
    selected.push(...pool);
  }

  return shuffle(selected);
}

// Asking a small local model to juggle "pick topics AND write several
// questions per topic AND keep every field correct" in one JSON blob proved
// unreliable in practice -- it kept spreading one question across many
// topics instead. Splitting into a topic-list call followed by one focused
// call per topic gives each call a task simple enough for the model to get
// right consistently.

const TopicListSchema = z.object({
  topics: z.array(z.string()).min(3).max(4),
});

const TOPIC_LIST_SYSTEM_PROMPT = `You are designing a skill assessment for a job candidate. Based on their field, seniority, and skills, choose exactly 3-4 specific, testable topics the assessment should cover. Each topic should be narrow enough to write several distinct questions about (e.g. "Contract Negotiation" not just "Business"). Respond ONLY with JSON: {"topics": string[]}`;

async function generateTopics(
  field: string,
  skills: string[],
  seniority: string
): Promise<string[]> {
  const userPrompt = `Field: ${field}
Seniority: ${seniority}
Candidate skills: ${skills.join(", ") || "not specified"}`;

  const result = await generateStructured(
    TopicListSchema,
    TOPIC_LIST_SYSTEM_PROMPT,
    userPrompt,
    { provider: "groq" }
  );
  return result.topics;
}

const TopicQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

const TopicQuestionSetSchema = z.object({
  questions: z.array(TopicQuestionSchema).min(3).max(5),
});

function topicQuestionsSystemPrompt(topic: string): string {
  return `You are writing multiple-choice skill assessment questions for the specific topic "${topic}". Write 4 multiple-choice questions testing real, practical knowledge a competent professional would need for this topic -- not trivia, not generic. Each question must have exactly 4 options with exactly one correct answer (correctIndex 0-3, zero-indexed). Respond ONLY with JSON: {"questions": [{"question": string, "options": [string, string, string, string], "correctIndex": number}]}`;
}

async function generateQuestionsForTopic(
  topic: string,
  field: string
): Promise<SeedQuestion[]> {
  const userPrompt = `Field: ${field}\nTopic: ${topic}`;
  const result = await generateStructured(
    TopicQuestionSetSchema,
    topicQuestionsSystemPrompt(topic),
    userPrompt,
    { provider: "groq" }
  );
  return result.questions.map((q) => ({
    id: crypto.randomUUID(),
    field,
    topic,
    question: q.question,
    options: q.options,
    correctIndex: q.correctIndex,
  }));
}

async function generateQuestionsWithLLM(
  field: string,
  skills: string[],
  seniority: string
): Promise<SeedQuestion[]> {
  const topics = await generateTopics(field, skills, seniority);

  const results = await Promise.allSettled(
    topics.map((topic) => generateQuestionsForTopic(topic, field))
  );

  const questions: SeedQuestion[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      questions.push(...result.value);
    } else {
      console.warn(
        `generateQuestionsWithLLM: failed to generate questions for a topic:`,
        result.reason
      );
    }
  }

  return questions;
}

function toMcqQuestion(q: SeedQuestion): AnyQuestion {
  return { ...q, type: "mcq" };
}

const MCQ_MIN_ACCEPTABLE = 4;

/** LLM generation is always tried first now, so questions are genuinely
 * different every run instead of reshuffling the same small hand-written
 * bank. The seed bank only kicks in as a fallback if the LLM path comes back
 * too thin (a Groq hiccup, a field with no matching topics, etc.) and the
 * field happens to be one we have a bank for -- better a repeated-but-real
 * test than none at all. */
async function buildMcqQuestions(
  field: string,
  skills: string[],
  seniority: string,
  canonicalField: string | null
): Promise<{ questions: SeedQuestion[]; usedFallback: boolean }> {
  let llmQuestions: SeedQuestion[] = [];
  try {
    llmQuestions = await generateQuestionsWithLLM(field, skills, seniority);
  } catch (err) {
    console.warn("buildMcqQuestions: LLM generation failed entirely:", err);
  }

  if (llmQuestions.length >= MCQ_MIN_ACCEPTABLE) {
    return {
      questions: shuffle(llmQuestions).slice(0, MCQ_TARGET_MAX),
      usedFallback: false,
    };
  }

  if (!canonicalField) {
    return { questions: llmQuestions, usedFallback: false };
  }

  const seedQuestions = selectSeedQuestions(canonicalField, skills);
  const seenQuestionText = new Set(llmQuestions.map((q) => q.question));
  const combined = [...llmQuestions];
  for (const q of seedQuestions) {
    if (combined.length >= MCQ_TARGET_MAX) break;
    if (seenQuestionText.has(q.question)) continue;
    seenQuestionText.add(q.question);
    combined.push(q);
  }

  return {
    questions: shuffle(combined).slice(0, MCQ_TARGET_MAX),
    usedFallback: true,
  };
}

export async function generateTest(resumeId: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume) {
    throw new Error("Resume not found.");
  }
  if (!resume.parsedJson) {
    throw new Error("Resume has not finished processing yet.");
  }

  const analysis = await prisma.analysis.findFirst({
    where: { resumeId },
    orderBy: { createdAt: "desc" },
  });

  const parsed = JSON.parse(resume.parsedJson) as { skills: string[] };
  const field = analysis?.detectedField ?? "General";
  const skills = parsed.skills ?? [];
  const seniority = analysis?.seniority ?? "Mid-level";

  const canonicalField = matchCanonicalField(field);
  const { questions: mcqQuestions, usedFallback } = await buildMcqQuestions(
    field,
    skills,
    seniority,
    canonicalField
  );

  const questions: AnyQuestion[] = mcqQuestions.map(toMcqQuestion);

  if (isCodingRelevantField(field)) {
    try {
      const codingQuestions = await generateCodingQuestions(
        field,
        skills,
        seniority
      );
      questions.push(...codingQuestions);
    } catch (err) {
      console.warn("generateTest: coding question generation failed:", err);
    }
  }

  if (questions.length === 0) {
    throw new Error("No questions available for this field.");
  }

  const test = await prisma.test.create({
    data: {
      resumeId,
      questionsJson: JSON.stringify(questions),
    },
  });

  return {
    testId: test.id,
    field,
    generatedByLLM: !usedFallback,
    questions: questions.map((q) =>
      q.type === "mcq"
        ? { ...q, correctIndex: undefined }
        : { ...q, testDriver: undefined }
    ),
  };
}
