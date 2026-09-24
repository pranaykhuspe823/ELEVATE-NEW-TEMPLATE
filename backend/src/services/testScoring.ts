import { prisma } from "../lib/prisma";
import { runInSandbox } from "./codeSandbox";
import type { AnyQuestion } from "../schemas/codingQuestion";
import type { CodingLanguage } from "../schemas/codingQuestion";

interface TopicStat {
  correct: number;
  total: number;
}

export interface CodeSubmission {
  language: CodingLanguage;
  code: string;
}

async function gradeCodingQuestion(
  question: Extract<AnyQuestion, { type: "coding" }>,
  submission: CodeSubmission | undefined
): Promise<{ fraction: number; passed: number; error: string | null }> {
  if (!submission) return { fraction: 0, passed: 0, error: "No submission." };

  const driver = question.testDriver[submission.language];
  if (!driver) {
    return {
      fraction: 0,
      passed: 0,
      error: `${submission.language} is not available for this question.`,
    };
  }

  const fullCode = `${submission.code}\n\n${driver}`;
  const result = await runInSandbox(submission.language, fullCode);

  if (result.compileError) {
    return { fraction: 0, passed: 0, error: `Compile error: ${result.compileError}` };
  }
  if (result.timedOut) {
    return { fraction: 0, passed: 0, error: "Execution timed out." };
  }

  const lines = result.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const passed = lines.filter((l) => l === "PASS").length;
  const fraction = Math.min(1, passed / question.testCaseCount);

  return {
    fraction,
    passed,
    error: fraction === 0 && result.stderr.trim() ? result.stderr.slice(0, 500) : null,
  };
}

export async function submitTest(
  testId: string,
  answers: Record<string, number>,
  codeSubmissions: Record<string, CodeSubmission> = {}
) {
  const test = await prisma.test.findUnique({ where: { id: testId } });
  if (!test) {
    throw new Error("Test not found.");
  }

  const questions = JSON.parse(test.questionsJson) as AnyQuestion[];
  const topicBreakdown: Record<string, TopicStat> = {};
  const codingResults: Record<
    string,
    { passed: number; total: number; error: string | null }
  > = {};
  let correctFractionSum = 0;

  for (const q of questions) {
    const stat = topicBreakdown[q.topic] ?? { correct: 0, total: 0 };
    stat.total += 1;

    if (q.type === "mcq") {
      if (answers[q.id] === q.correctIndex) {
        stat.correct += 1;
        correctFractionSum += 1;
      }
    } else {
      const { fraction, passed, error } = await gradeCodingQuestion(
        q,
        codeSubmissions[q.id]
      );
      stat.correct += fraction;
      correctFractionSum += fraction;
      codingResults[q.id] = { passed, total: q.testCaseCount, error };
    }

    topicBreakdown[q.topic] = stat;
  }

  const scoreOutOfTen = questions.length
    ? Math.round((correctFractionSum / questions.length) * 100) / 10
    : 0;

  const inProgress = await prisma.testAttempt.findFirst({
    where: { testId, completedAt: null },
    orderBy: { startedAt: "desc" },
  });

  const attemptData = {
    answersJson: JSON.stringify({ answers, codeSubmissions, codingResults }),
    score: scoreOutOfTen,
    topicBreakdownJson: JSON.stringify(topicBreakdown),
    completedAt: new Date(),
  };

  const attempt = inProgress
    ? await prisma.testAttempt.update({
        where: { id: inProgress.id },
        data: attemptData,
      })
    : await prisma.testAttempt.create({ data: { testId, ...attemptData } });

  return {
    attemptId: attempt.id,
    score: scoreOutOfTen,
    correctCount: Math.round(correctFractionSum * 100) / 100,
    total: questions.length,
    topicBreakdown,
    codingResults,
  };
}
