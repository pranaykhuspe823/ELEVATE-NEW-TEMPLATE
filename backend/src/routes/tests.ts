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
import { atsBoost, latestAtsBaseline, parseKeywords } from "../services/atsBoost";

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
    // Fire-and-forget: builds the AI-suggested modules the student sees on
    // their results page (GET /:id/course-plan polls for it) and faculty can
    // assign from -- submitting doesn't wait on the LLM.
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

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** The courses recommended from the latest completed attempt, each with what
 * it would add to the student's ATS score and whether they've started it. */
testsRouter.get("/:id/course-plan", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }

  const attempt = await prisma.testAttempt.findFirst({
    where: { testId: test.id, completedAt: { not: null } },
    orderBy: { completedAt: "desc" },
    include: {
      coursePlans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { modules: true },
      },
    },
  });
  if (!attempt) {
    res.status(404).json({ error: "No completed attempt for this test yet." });
    return;
  }

  const plan = attempt.coursePlans[0];
  const empty = { atsScore: null, combinedBoost: 0, combinedProjectedScore: null, modules: [] };
  // The plan is generated in the background right after submit.
  if (!plan || plan.status === "generating") {
    res.json({ status: "generating", ...empty });
    return;
  }
  if (plan.status === "failed") {
    res.json({ status: "failed", ...empty });
    return;
  }

  const [baseline, enrollments] = await Promise.all([
    latestAtsBaseline(req.user!.id),
    prisma.courseAssignment.findMany({
      where: {
        studentId: req.user!.id,
        sourceModuleId: { in: plan.modules.map((m) => m.id) },
      },
    }),
  ]);
  const enrollmentByModule = new Map(enrollments.map((a) => [a.sourceModuleId, a]));

  const modules = plan.modules
    .map((m) => {
      const boost = baseline ? atsBoost(baseline, parseKeywords(m.keywordsJson)) : null;
      const enrollment = enrollmentByModule.get(m.id);
      return {
        id: m.id,
        title: m.title,
        topic: m.topic,
        priority: m.priority,
        estimatedHours: m.estimatedHours,
        resources: JSON.parse(m.resourcesJson),
        keywords: boost?.keywords ?? [],
        atsBoost: boost?.points ?? 0,
        projectedScore: boost?.projectedScore ?? null,
        enrollment: enrollment
          ? {
              assignmentId: enrollment.id,
              status: enrollment.status,
              progressPercent: enrollment.progressPercent,
            }
          : null,
      };
    })
    .sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) ||
        b.atsBoost - a.atsBoost
    );

  const combined = baseline
    ? atsBoost(baseline, plan.modules.flatMap((m) => parseKeywords(m.keywordsJson)))
    : null;

  res.json({
    status: "ready",
    atsScore: baseline?.totalScore ?? null,
    combinedBoost: combined?.points ?? 0,
    combinedProjectedScore: combined?.projectedScore ?? null,
    modules,
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
