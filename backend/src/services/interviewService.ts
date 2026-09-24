import { prisma } from "../lib/prisma";
import { generateStructured } from "../lib/llm";
import {
  KeywordExtractionSchema,
  NextTurnSchema,
  EvaluationSchema,
} from "../schemas/interview";
import type { TranscriptTurn } from "../schemas/interview";
import type { ParsedResume } from "../schemas/resume";

const TOTAL_QUESTIONS = 9;

type Difficulty = "easy" | "medium" | "hard";

function difficultyForQuestion(questionNumber: number): Difficulty {
  if (questionNumber <= 4) return "easy";
  if (questionNumber <= 7) return "medium";
  return "hard";
}

const DIFFICULTY_GUIDANCE: Record<Difficulty, string> = {
  easy: "EASY / warm-up tier: ask about general background or a straightforward, factual thing from their resume (e.g. what a listed skill/tool was used for, a brief summary of a role). Keep it approachable.",
  medium:
    "MEDIUM tier: a project deep-dive -- ask HOW they solved a specific problem, about a trade-off they made, or to explain a technical decision behind something on their resume.",
  hard: "HARD tier: a system-design question, an edge-case question, a 'what would you do differently' question, or a behavioral pressure question -- tie it to their MOST SENIOR/advanced claim on the resume.",
};

function resumeSummaryText(parsed: ParsedResume, targetRole?: string | null): string {
  const titles = parsed.experience
    .map((e) => `${e.title ?? "Unknown role"} at ${e.company ?? "unknown company"}`)
    .join("; ");
  const experienceBullets = parsed.experience
    .flatMap((e) => e.bullets)
    .map((b) => `- ${b}`)
    .join("\n");
  const projects = parsed.projects
    .map(
      (p) =>
        `- ${p.name ?? "Untitled project"}: ${p.description ?? ""} (${p.technologies.join(", ")})`
    )
    .join("\n");

  return `${targetRole ? `Target role: ${targetRole}\n` : ""}Skills: ${parsed.skills.join(", ") || "none listed"}
Job titles: ${titles || "none listed"}

Experience bullets:
${experienceBullets || "(none)"}

Projects:
${projects || "(none)"}`;
}

function transcriptText(transcript: TranscriptTurn[]): string {
  return transcript
    .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n");
}

function interviewerQuestionCount(transcript: TranscriptTurn[]): number {
  return transcript.filter((t) => t.role === "interviewer").length;
}

/** Which of the extracted resume keywords have already shown up in a
 * question the interviewer has asked so far -- a plain substring check
 * against past interviewer turns, good enough since the model is
 * instructed to reference keyword phrases near-verbatim. */
function usedKeywords(keywords: string[], transcript: TranscriptTurn[]): string[] {
  const interviewerText = transcript
    .filter((t) => t.role === "interviewer")
    .map((t) => t.text.toLowerCase())
    .join(" ");
  return keywords.filter((kw) => interviewerText.includes(kw.toLowerCase()));
}

const KEYWORD_EXTRACTION_SYSTEM_PROMPT = `You are extracting interview-worthy keywords from a candidate's resume, to ground a mock interview's questions in specifics rather than generic topics. Pull out 10-20 SPECIFIC, concrete phrases: named skills/technologies/tools/frameworks (e.g. "React", "PostgreSQL", "Kubernetes"), specific project names, quantified metrics/achievements (e.g. "reduced latency by 40%", "led a team of 5"), and role/title-specific responsibilities. Do NOT include generic soft-skill words (teamwork, communication, leadership, problem-solving) or vague category words (programming, software) -- every entry must be something an interviewer could point to and ask "tell me about X" where X is unambiguous and specific to THIS candidate. Order the list roughly by how interview-worthy/substantial each one is (most significant/impressive first). Respond ONLY with JSON: {"keywords": string[]}`;

const MAX_KEYWORDS = 20;

async function extractResumeKeywords(parsed: ParsedResume): Promise<string[]> {
  const { keywords } = await generateStructured(
    KeywordExtractionSchema,
    KEYWORD_EXTRACTION_SYSTEM_PROMPT,
    resumeSummaryText(parsed),
    { provider: "groq" }
  );
  // The prompt already ranks most-interview-worthy first, so truncating
  // just keeps the strongest ones rather than rejecting a merely-long list.
  return keywords.slice(0, MAX_KEYWORDS);
}

export async function startInterview(resumeId: string, targetRole?: string) {
  const resume = await prisma.resume.findUnique({ where: { id: resumeId } });
  if (!resume || !resume.parsedJson) {
    throw new Error("Resume not found or not yet analyzed.");
  }
  const parsed = JSON.parse(resume.parsedJson) as ParsedResume;

  const keywords = await extractResumeKeywords(parsed);

  // Question 1 is always this fixed, literal greeting -- never LLM-generated
  // -- so every interview opens the same warm, predictable way.
  const firstName = parsed.contact.name?.split(" ")[0];
  const question = `Hi ${firstName || "there"}, thanks for taking the time to do this today! Let's get started — tell me about yourself.`;

  const transcript: TranscriptTurn[] = [{ role: "interviewer", text: question }];
  const interview = await prisma.interview.create({
    data: {
      resumeId,
      targetRole: targetRole ?? null,
      transcriptJson: JSON.stringify(transcript),
      keywordsJson: JSON.stringify(keywords),
    },
  });

  return { interviewId: interview.id, question };
}

function buildClosingSystemPrompt(): string {
  return `You are a warm, professional mock interviewer. The candidate just answered the final question (${TOTAL_QUESTIONS} of ${TOTAL_QUESTIONS}). Do NOT ask another question. Respond with a brief, warm closing statement (2-3 sentences) thanking them for their time and letting them know the interview is complete. Respond ONLY with JSON: {"done": true, "interviewerText": string}`;
}

function buildNextTurnSystemPrompt(
  questionNumber: number,
  keywords: string[],
  used: string[]
): string {
  const difficulty = difficultyForQuestion(questionNumber);
  const keywordList = keywords.map((k) => `- ${k}`).join("\n");
  const usedList = used.length > 0 ? used.join(", ") : "(none yet)";

  return `You are a professional, warm but rigorous technical interviewer conducting a mock interview, mid-conversation. You're given the candidate's resume, a ranked list of interview-worthy keywords extracted from it, which of those keywords have already been used, and the full transcript so far.

This is question ${questionNumber} of ${TOTAL_QUESTIONS} total. ${DIFFICULTY_GUIDANCE[difficulty]}

Resume keywords to draw questions from (specific skills, tools, project names, metrics, role titles):
${keywordList}

Keywords already used in previous questions (avoid repeating these unless it's a natural, direct follow-up to the candidate's last answer): ${usedList}

Rules:
- Ask ONE question, and it must visibly draw from one of the UNUSED keywords/phrases above -- rotate through them, don't circle back to the same 2-3 topics.
- Do not grade or evaluate the candidate's answer out loud. Start with a brief, natural, conversational acknowledgement of their last answer (a sentence or less, using contractions -- e.g. "Got it, thanks" or "That makes sense" or "Nice, okay") folded into the start of your response, then ask the next question, as ONE short spoken utterance (2-3 sentences total, since it will be spoken aloud via text-to-speech). Sound like a real person talking, not a robotic Q&A script.
Respond ONLY with JSON: {"done": false, "interviewerText": string}`;
}

export async function submitTurn(interviewId: string, candidateText: string) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new Error("Interview not found.");
  if (interview.status === "completed") {
    throw new Error("This interview has already ended.");
  }

  const resume = await prisma.resume.findUnique({ where: { id: interview.resumeId } });
  if (!resume || !resume.parsedJson) throw new Error("Resume not found.");
  const parsed = JSON.parse(resume.parsedJson) as ParsedResume;
  const keywords = JSON.parse(interview.keywordsJson) as string[];

  const transcript = JSON.parse(interview.transcriptJson) as TranscriptTurn[];
  transcript.push({ role: "candidate", text: candidateText });

  // Deterministic, server-enforced arc -- never trust the model's own count
  // of "how many exchanges so far" against the fixed 9-question cap.
  const priorQuestionCount = interviewerQuestionCount(transcript);
  const isClosingTurn = priorQuestionCount >= TOTAL_QUESTIONS;
  const nextQuestionNumber = priorQuestionCount + 1;

  const systemPrompt = isClosingTurn
    ? buildClosingSystemPrompt()
    : buildNextTurnSystemPrompt(nextQuestionNumber, keywords, usedKeywords(keywords, transcript));

  const userPrompt = `${resumeSummaryText(parsed, interview.targetRole)}

Transcript so far:
${transcriptText(transcript)}`;

  const result = await generateStructured(NextTurnSchema, systemPrompt, userPrompt, {
    provider: "groq",
  });
  const done = isClosingTurn || result.done;
  const interviewerText = result.interviewerText;

  if (interviewerText) {
    transcript.push({ role: "interviewer", text: interviewerText });
  }

  await prisma.interview.update({
    where: { id: interviewId },
    data: { transcriptJson: JSON.stringify(transcript) },
  });

  if (done) {
    await evaluateInterview(interviewId);
  }

  return { interviewerText, isComplete: done };
}

const EVALUATOR_SYSTEM_PROMPT = `You are evaluating a completed mock interview. You're given the candidate's resume and the full interview transcript. Score the candidate 0-100 on each of: overallScore, communicationScore (clarity, structure of answers), technicalDepthScore (depth/correctness of technical answers), resumeConsistencyScore (did their spoken answers actually support/match the claims on their resume, or contradict/inflate them?), confidenceScore (how confidently and directly they answered, versus hedging/rambling). List strengths, weaknesses, and redFlags (specific concerning moments, e.g. inability to explain something listed on their own resume -- empty array if none) as short bullet-point strings. Give a recommendation of exactly one of "Strong Hire", "Hire", "Lean Hire", "No Hire", a 1-2 sentence recommendationReason, and a detailedFeedback paragraph (3-5 sentences) synthesizing the whole interview. Be specific and grounded in what was actually said, not generic. Respond ONLY with JSON: {"overallScore": number, "communicationScore": number, "technicalDepthScore": number, "resumeConsistencyScore": number, "confidenceScore": number, "strengths": string[], "weaknesses": string[], "redFlags": string[], "recommendation": string, "recommendationReason": string, "detailedFeedback": string}`;

export async function evaluateInterview(interviewId: string) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new Error("Interview not found.");

  const resume = await prisma.resume.findUnique({ where: { id: interview.resumeId } });
  if (!resume || !resume.parsedJson) throw new Error("Resume not found.");
  const parsed = JSON.parse(resume.parsedJson) as ParsedResume;
  const transcript = JSON.parse(interview.transcriptJson) as TranscriptTurn[];

  const userPrompt = `${resumeSummaryText(parsed, interview.targetRole)}

Full transcript:
${transcriptText(transcript)}`;

  const evaluation = await generateStructured(
    EvaluationSchema,
    EVALUATOR_SYSTEM_PROMPT,
    userPrompt,
    { provider: "groq" }
  );

  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "completed",
      completedAt: new Date(),
      overallScore: evaluation.overallScore,
      communicationScore: evaluation.communicationScore,
      technicalDepthScore: evaluation.technicalDepthScore,
      resumeConsistencyScore: evaluation.resumeConsistencyScore,
      confidenceScore: evaluation.confidenceScore,
      feedbackJson: JSON.stringify({
        strengths: evaluation.strengths,
        weaknesses: evaluation.weaknesses,
        redFlags: evaluation.redFlags,
      }),
      recommendation: evaluation.recommendation,
      recommendationReason: evaluation.recommendationReason,
      detailedFeedback: evaluation.detailedFeedback,
    },
  });
}
