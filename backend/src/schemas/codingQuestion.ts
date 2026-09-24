import { z } from "zod";

export const CODING_LANGUAGES = ["javascript", "python", "c", "cpp"] as const;
export type CodingLanguage = (typeof CODING_LANGUAGES)[number];

export const CODING_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type CodingDifficulty = (typeof CODING_DIFFICULTIES)[number];

export const CodingQuestionSchema = z.object({
  topic: z.string(),
  title: z.string(),
  problemStatement: z.string(),
  functionName: z.string(),
  starterCode: z.object({
    javascript: z.string(),
    python: z.string(),
    c: z.string(),
    cpp: z.string(),
  }),
  testDriver: z.object({
    javascript: z.string(),
    python: z.string(),
    c: z.string(),
    cpp: z.string(),
  }),
  // Not trusted as-is -- the real count used for grading is derived from
  // actually running the driver during validation (see codingQuestionGeneration.ts),
  // since the LLM sometimes omits this or reports a number that doesn't match
  // how many PASS/FAIL lines the driver it wrote actually prints.
  testCaseCount: z.number().int().min(1).max(10).optional(),
});

export type GeneratedCodingQuestion = z.infer<typeof CodingQuestionSchema>;

export interface CodingQuestion {
  id: string;
  type: "coding";
  field: string;
  topic: string;
  title: string;
  difficulty: CodingDifficulty;
  problemStatement: string;
  functionName: string;
  // Only languages that were verified to run cleanly at generation time are
  // present here -- not guaranteed to have all four keys.
  starterCode: Partial<Record<CodingLanguage, string>>;
  testDriver: Partial<Record<CodingLanguage, string>>;
  testCaseCount: number;
}

export interface McqQuestion {
  id: string;
  type: "mcq";
  field: string;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export type AnyQuestion = McqQuestion | CodingQuestion;
