import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { statusForProgress } from "../lib/courseProgress";
import { atsBoost, latestAtsBaseline, parseKeywords } from "../services/atsBoost";
import {
  QUIZ_RETRY_COOLDOWN_MS,
  QUIZ_STAGES,
  generateCourseQuiz,
  gradeQuiz,
  nextStageFor,
  type QuizQuestion,
  type QuizStage,
} from "../services/courseQuiz";

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

/** Every course on the current user's plate, newest first: ones a faculty
 * member assigned and ones they started themself from their test results'
 * recommendations (assignedBy null). */
assignmentsRouter.get("/me", async (req, res) => {
  const [assignments, baseline] = await Promise.all([
    prisma.courseAssignment.findMany({
      where: { studentId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        assignedBy: { select: { name: true, email: true } },
        quizzes: {
          where: { submittedAt: { not: null } },
          orderBy: { submittedAt: "desc" },
          select: { stage: true, score: true, passed: true, submittedAt: true },
        },
      },
    }),
    latestAtsBaseline(req.user!.id),
  ]);
  res.json({
    atsScore: baseline?.totalScore ?? null,
    assignments: assignments.map((a) => {
      const boost = baseline ? atsBoost(baseline, parseKeywords(a.keywordsJson)) : null;
      const nextStage = nextStageFor(a.progressPercent);
      const lastAttempt = nextStage ? a.quizzes.find((q) => q.stage === nextStage) : undefined;
      const retryAt =
        lastAttempt && !lastAttempt.passed && lastAttempt.submittedAt
          ? new Date(lastAttempt.submittedAt.getTime() + QUIZ_RETRY_COOLDOWN_MS)
          : null;
      return {
        nextQuiz: nextStage
          ? {
              stage: nextStage,
              label: QUIZ_STAGES[nextStage].label,
              questionCount: QUIZ_STAGES[nextStage].questionCount,
              passPercent: QUIZ_STAGES[nextStage].passPercent,
              progressOnPass: QUIZ_STAGES[nextStage].progressOnPass,
              lastScore: lastAttempt?.score ?? null,
              retryAt: retryAt && retryAt > new Date() ? retryAt : null,
            }
          : null,
        id: a.id,
        title: a.title,
        topic: a.topic,
        priority: a.priority,
        estimatedHours: a.estimatedHours,
        resources: JSON.parse(a.resourcesJson),
        reason: a.reason,
        status: a.status,
        progressPercent: a.progressPercent,
        keywords: boost?.keywords ?? [],
        atsBoost: boost?.points ?? 0,
        assignedBy: a.assignedBy ? a.assignedBy.name ?? a.assignedBy.email : null,
        createdAt: a.createdAt,
      };
    }),
  });
});

/** Student starts one of the AI-recommended courses from their own test
 * results. Starting the same module twice returns the existing course. */
assignmentsRouter.post("/enroll", async (req, res) => {
  const { moduleId } = req.body as { moduleId?: unknown };
  if (typeof moduleId !== "string" || !moduleId) {
    res.status(400).json({ error: "moduleId is required." });
    return;
  }
  const source = await prisma.courseModule.findUnique({
    where: { id: moduleId },
    include: {
      coursePlan: {
        include: {
          testAttempt: {
            include: { test: { include: { resume: { select: { userId: true } } } } },
          },
        },
      },
    },
  });
  if (!source || source.coursePlan.testAttempt.test.resume.userId !== req.user!.id) {
    res.status(404).json({ error: "Recommended course not found." });
    return;
  }

  const existing = await prisma.courseAssignment.findFirst({
    where: { studentId: req.user!.id, sourceModuleId: source.id },
  });
  if (existing) {
    res.json({
      id: existing.id,
      status: existing.status,
      progressPercent: existing.progressPercent,
    });
    return;
  }

  const created = await prisma.courseAssignment.create({
    data: {
      studentId: req.user!.id,
      assignedById: null,
      sourceModuleId: source.id,
      title: source.title,
      topic: source.topic,
      priority: source.priority,
      estimatedHours: source.estimatedHours,
      resourcesJson: source.resourcesJson,
      keywordsJson: source.keywordsJson,
    },
  });
  res.status(201).json({
    id: created.id,
    status: created.status,
    progressPercent: created.progressPercent,
  });
});

/** Progress isn't self-reported: it moves only when the student passes the
 * course's quizzes (checkpoint -> 50%, final -> 100%). Starting a quiz
 * returns the open, unsubmitted one for the next stage if there is one, or
 * generates a fresh one. The correct answers stay on the server. */
assignmentsRouter.post("/:id/quiz", async (req, res) => {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: req.params.id },
  });
  if (!assignment || assignment.studentId !== req.user!.id) {
    res.status(404).json({ error: "Assignment not found." });
    return;
  }
  const stage = nextStageFor(assignment.progressPercent);
  if (!stage) {
    res.status(409).json({ error: "You've already completed this course." });
    return;
  }

  const open = await prisma.courseQuiz.findFirst({
    where: { assignmentId: assignment.id, stage, submittedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (open) {
    res.json(serializeQuizForStudent(open));
    return;
  }

  const retryAt = await retryAvailableAt(assignment.id, stage);
  if (retryAt) {
    res.status(429).json({
      error: "You can retake this quiz shortly. Use the time to review the course.",
      retryAt,
    });
    return;
  }

  let questions: QuizQuestion[];
  try {
    questions = await generateCourseQuiz(
      {
        title: assignment.title,
        topic: assignment.topic,
        keywords: parseKeywords(assignment.keywordsJson),
      },
      stage
    );
  } catch (err) {
    console.error("course quiz generation failed:", err);
    res.status(502).json({ error: "Couldn't create the quiz right now. Please try again." });
    return;
  }
  const quiz = await prisma.courseQuiz.create({
    data: { assignmentId: assignment.id, stage, questionsJson: JSON.stringify(questions) },
  });
  res.status(201).json(serializeQuizForStudent(quiz));
});

/** Grades a quiz. Passing moves the course to that stage's progress (50% or
 * 100%); either way the answers and explanations are returned for review. */
assignmentsRouter.post("/quizzes/:quizId/submit", async (req, res) => {
  const quiz = await prisma.courseQuiz.findUnique({
    where: { id: req.params.quizId },
    include: { assignment: true },
  });
  if (!quiz || quiz.assignment.studentId !== req.user!.id) {
    res.status(404).json({ error: "Quiz not found." });
    return;
  }
  if (quiz.submittedAt) {
    res.status(409).json({ error: "This quiz has already been submitted." });
    return;
  }

  const questions = JSON.parse(quiz.questionsJson) as QuizQuestion[];
  const { answers } = req.body as { answers?: unknown };
  if (
    !Array.isArray(answers) ||
    answers.length !== questions.length ||
    !answers.every((a) => Number.isInteger(a) && a >= 0 && a <= 3)
  ) {
    res.status(400).json({ error: "Answer every question before submitting." });
    return;
  }

  const stageInfo = QUIZ_STAGES[quiz.stage as QuizStage];
  const score = gradeQuiz(questions, answers as number[]);
  const passed = score >= stageInfo.passPercent;
  const current = quiz.assignment;
  const progressPercent = passed
    ? Math.max(current.progressPercent, stageInfo.progressOnPass)
    : current.progressPercent;
  const status = statusForProgress(progressPercent);

  const [, updated] = await prisma.$transaction([
    prisma.courseQuiz.update({
      where: { id: quiz.id },
      data: { answersJson: JSON.stringify(answers), score, passed, submittedAt: new Date() },
    }),
    prisma.courseAssignment.update({
      where: { id: current.id },
      data: {
        progressPercent,
        status,
        completedAt: status === "completed" ? current.completedAt ?? new Date() : null,
      },
    }),
  ]);

  res.json({
    score,
    passed,
    passPercent: stageInfo.passPercent,
    progressPercent: updated.progressPercent,
    status: updated.status,
    retryAt: passed ? null : new Date(Date.now() + QUIZ_RETRY_COOLDOWN_MS),
    review: questions.map((q, i) => ({
      chosenIndex: (answers as number[])[i],
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    })),
  });
});

function serializeQuizForStudent(quiz: { id: string; stage: number; questionsJson: string }) {
  const stageInfo = QUIZ_STAGES[quiz.stage as QuizStage];
  const questions = JSON.parse(quiz.questionsJson) as QuizQuestion[];
  return {
    quizId: quiz.id,
    stage: quiz.stage,
    label: stageInfo.label,
    passPercent: stageInfo.passPercent,
    progressOnPass: stageInfo.progressOnPass,
    // No correctIndex / explanation: those come back only after submitting.
    questions: questions.map((q) => ({ question: q.question, options: q.options })),
  };
}

/** When the student may start a new quiz for this stage after failing one,
 * or null if they can start now. */
async function retryAvailableAt(assignmentId: string, stage: QuizStage): Promise<Date | null> {
  const lastFail = await prisma.courseQuiz.findFirst({
    where: { assignmentId, stage, passed: false },
    orderBy: { submittedAt: "desc" },
    select: { submittedAt: true },
  });
  if (!lastFail?.submittedAt) return null;
  const at = new Date(lastFail.submittedAt.getTime() + QUIZ_RETRY_COOLDOWN_MS);
  return at > new Date() ? at : null;
}
