import { Router } from "express";
import { prisma } from "../lib/prisma";
import { submitTest } from "../services/testScoring";
import type { CodeSubmission } from "../services/testScoring";
import { generateCoursePlan } from "../services/coursePlanGeneration";
import { generateReferenceSolution } from "../services/codingQuestionGeneration";
import { CODING_LANGUAGES } from "../schemas/codingQuestion";
import type { AnyQuestion, CodingLanguage } from "../schemas/codingQuestion";
import { requireAuth } from "../middleware/auth";
import { findOwnedTest } from "../lib/ownership";

export const testsRouter = Router();
testsRouter.use(requireAuth);

testsRouter.get("/:id", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }

  // Start (or resume) the in-progress attempt the first time the test is
  // actually opened, so "time taken" reflects real elapsed time rather than
  // being created at submit time (which would always be ~0s).
  const existingAttempt = await prisma.testAttempt.findFirst({
    where: { testId: test.id, completedAt: null },
  });
  if (!existingAttempt) {
    await prisma.testAttempt.create({ data: { testId: test.id } });
  }

  const questions = (JSON.parse(test.questionsJson) as AnyQuestion[]).map(
    (q) =>
      q.type === "mcq"
        ? { ...q, correctIndex: undefined }
        : { ...q, testDriver: undefined }
  );
  res.json({ testId: test.id, resumeId: test.resumeId, questions });
});

testsRouter.post("/:id/submit", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }
  const { answers, codeSubmissions } = req.body as {
    answers?: Record<string, number>;
    codeSubmissions?: Record<string, CodeSubmission>;
  };
  if (!answers || typeof answers !== "object") {
    res.status(400).json({ error: "answers object is required." });
    return;
  }
  try {
    const result = await submitTest(
      req.params.id,
      answers,
      codeSubmissions ?? {}
    );
    // Fire-and-forget: courses are only ever assigned by faculty (never
    // self-served), so this just pre-builds the AI-suggested modules faculty
    // pick from -- the student doesn't wait on it and never sees it directly.
    generateCoursePlan(req.params.id).catch(() => {});
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

testsRouter.get("/:id/results", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }

  const attempt = await prisma.testAttempt.findFirst({
    where: { testId: req.params.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
  });
  if (!attempt) {
    res.status(404).json({ error: "No completed attempt for this test yet." });
    return;
  }

  const questions = test
    ? (JSON.parse(test.questionsJson) as AnyQuestion[])
    : [];
  const codingQuestionInfo = Object.fromEntries(
    questions
      .filter((q) => q.type === "coding")
      .map((q) => [q.id, { title: q.title, topic: q.topic, difficulty: q.difficulty }])
  );

  let codingResults: Record<
    string,
    { passed: number; total: number; error: string | null }
  > = {};
  let answers: Record<string, number> = {};
  let codeSubmissions: Record<string, { language: string; code: string }> = {};
  if (attempt.answersJson) {
    try {
      const parsed = JSON.parse(attempt.answersJson) as {
        answers?: typeof answers;
        codeSubmissions?: typeof codeSubmissions;
        codingResults?: typeof codingResults;
      };
      answers = parsed.answers ?? {};
      codeSubmissions = parsed.codeSubmissions ?? {};
      codingResults = parsed.codingResults ?? {};
    } catch {
      // pre-coding-questions attempts stored answersJson as a plain answers map
    }
  }

  const questionBreakdown = questions.map((q) => {
    if (q.type === "mcq") {
      const userAnswerIndex = answers[q.id] ?? null;
      return {
        id: q.id,
        type: "mcq" as const,
        topic: q.topic,
        question: q.question,
        options: q.options,
        userAnswerIndex,
        correctIndex: q.correctIndex,
        isCorrect: userAnswerIndex === q.correctIndex,
      };
    }
    const result = codingResults[q.id];
    const submission = codeSubmissions[q.id];
    return {
      id: q.id,
      type: "coding" as const,
      topic: q.topic,
      title: q.title,
      difficulty: q.difficulty,
      problemStatement: q.problemStatement,
      language: submission?.language ?? null,
      userCode: submission?.code ?? null,
      passed: result?.passed ?? 0,
      total: result?.total ?? q.testCaseCount,
      error: result?.error ?? null,
      isCorrect: (result?.passed ?? 0) >= (result?.total ?? q.testCaseCount),
    };
  });

  res.json({
    attemptId: attempt.id,
    score: attempt.score,
    topicBreakdown: attempt.topicBreakdownJson
      ? JSON.parse(attempt.topicBreakdownJson)
      : {},
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    codingResults: Object.fromEntries(
      Object.entries(codingResults).map(([id, r]) => [
        id,
        { ...r, ...codingQuestionInfo[id] },
      ])
    ),
    questionBreakdown,
  });
});

testsRouter.get("/:id/questions/:questionId/solution", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }

  const question = (JSON.parse(test.questionsJson) as AnyQuestion[]).find(
    (q) => q.id === req.params.questionId
  );
  if (!question || question.type !== "coding") {
    res.status(404).json({ error: "Coding question not found." });
    return;
  }

  const language = req.query.language as CodingLanguage | undefined;
  const resolvedLanguage =
    language && (CODING_LANGUAGES as readonly string[]).includes(language)
      ? language
      : "javascript";

  try {
    const solution = await generateReferenceSolution(
      question.problemStatement,
      question.functionName,
      resolvedLanguage
    );
    res.json(solution);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});

testsRouter.post("/:id/retake", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }
  const attempt = await prisma.testAttempt.create({ data: { testId: test.id } });
  res.status(201).json({ attemptId: attempt.id });
});
