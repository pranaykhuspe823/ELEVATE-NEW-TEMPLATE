import { z } from "zod";

// Upper bound is deliberately loose (LLMs routinely overshoot a requested
// count) -- the real cap of 20 is enforced by truncating in code after a
// successful parse, in extractResumeKeywords(), rather than making a
// slightly-over response a hard validation failure that burns the one retry.
export const KeywordExtractionSchema = z.object({
  keywords: z.array(z.string()).min(5).max(40),
});

export const NextTurnSchema = z.object({
  done: z.boolean(),
  interviewerText: z.string().nullable(),
});

export const INTERVIEW_RECOMMENDATIONS = [
  "Strong Hire",
  "Hire",
  "Lean Hire",
  "No Hire",
] as const;

export const EvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  technicalDepthScore: z.number().min(0).max(100),
  resumeConsistencyScore: z.number().min(0).max(100),
  confidenceScore: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  redFlags: z.array(z.string()),
  recommendation: z.enum(INTERVIEW_RECOMMENDATIONS),
  recommendationReason: z.string(),
  detailedFeedback: z.string(),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

export interface TranscriptTurn {
  role: "interviewer" | "candidate";
  text: string;
}
