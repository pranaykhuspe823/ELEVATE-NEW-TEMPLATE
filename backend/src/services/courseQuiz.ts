import { z } from "zod";
import { generateStructured } from "../lib/llm";

/** Stage 1 is the halfway checkpoint, stage 2 the final quiz. */
export type QuizStage = 1 | 2;

export const QUIZ_STAGES: Record<
  QuizStage,
  { questionCount: number; passPercent: number; progressOnPass: number; label: string }
> = {
  1: { questionCount: 5, passPercent: 60, progressOnPass: 50, label: "Checkpoint quiz" },
  2: { questionCount: 8, passPercent: 70, progressOnPass: 100, label: "Final quiz" },
};

/** After a failed attempt, a new quiz for that stage can't be started for this long. */
export const QUIZ_RETRY_COOLDOWN_MS = 10 * 60 * 1000;

export function isQuizStage(value: unknown): value is QuizStage {
  return value === 1 || value === 2;
}

/** The stage a course is ready for, from its progress: 0% -> checkpoint,
 * 50% -> final, 100% -> none (done). */
export function nextStageFor(progressPercent: number): QuizStage | null {
  if (progressPercent >= 100) return null;
  return progressPercent >= 50 ? 2 : 1;
}

const questionSchema = z.object({
  question: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().default(""),
});
export type QuizQuestion = z.infer<typeof questionSchema>;

const quizSchema = z.object({ questions: z.array(questionSchema).min(1) });

const SYSTEM_PROMPT = `You write multiple-choice quizzes that check whether a student actually studied a course.
Respond with ONLY a JSON object: {"questions":[{"question":string,"options":[4 strings],"correctIndex":0-3,"explanation":string}]}.
Rules:
- Every question has exactly 4 plausible options and exactly one correct answer.
- Test understanding and application, not trivia or wording from a specific video.
- Vary which option index is correct.
- No "all of the above" / "none of the above".
- explanation: one short sentence on why the answer is right.`;

export async function generateCourseQuiz(
  course: { title: string; topic: string; keywords: string[] },
  stage: QuizStage
): Promise<QuizQuestion[]> {
  const { questionCount } = QUIZ_STAGES[stage];
  const scope =
    stage === 1
      ? "This is the HALFWAY checkpoint: cover the fundamentals and core concepts a student should know after the first half of the course."
      : "This is the FINAL quiz: cover the whole course, including more advanced concepts and practical application.";
  const keywordLine = course.keywords.length
    ? `Key skills the course teaches: ${course.keywords.join(", ")}.`
    : "";

  const result = await generateStructured(
    quizSchema,
    SYSTEM_PROMPT,
    `Course: "${course.title}"\nTopic: ${course.topic}\n${keywordLine}\n${scope}\nWrite exactly ${questionCount} questions.`
  );
  if (result.questions.length < questionCount) {
    throw new Error("The quiz came back too short. Please try again.");
  }
  return result.questions.slice(0, questionCount);
}

/** Percentage of questions answered correctly (0-100). */
export function gradeQuiz(questions: QuizQuestion[], answers: number[]): number {
  const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
  return Math.round((correct / questions.length) * 100);
}
