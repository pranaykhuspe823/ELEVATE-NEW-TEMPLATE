import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  isAssignmentStatus,
  isProgressPercent,
  progressForStatus,
  statusForProgress,
} from "../lib/courseProgress";
import { atsBoost, latestAtsBaseline, parseKeywords } from "../services/atsBoost";

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
      include: { assignedBy: { select: { name: true, email: true } } },
    }),
    latestAtsBaseline(req.user!.id),
  ]);
  res.json({
    atsScore: baseline?.totalScore ?? null,
    assignments: assignments.map((a) => {
      const boost = baseline ? atsBoost(baseline, parseKeywords(a.keywordsJson)) : null;
      return {
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

/** Student reports their progress, as a percentage (status follows it) or
 * as a status (progress follows it). */
assignmentsRouter.patch("/:id", async (req, res) => {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: req.params.id },
  });
  if (!assignment || assignment.studentId !== req.user!.id) {
    res.status(404).json({ error: "Assignment not found." });
    return;
  }
  const { status, progressPercent } = req.body as {
    status?: unknown;
    progressPercent?: unknown;
  };

  let next: { status: string; progressPercent: number };
  if (progressPercent !== undefined) {
    if (!isProgressPercent(progressPercent)) {
      res.status(400).json({ error: "progressPercent must be a whole number from 0 to 100." });
      return;
    }
    next = { progressPercent, status: statusForProgress(progressPercent) };
  } else if (isAssignmentStatus(status)) {
    next = { status, progressPercent: progressForStatus(status, assignment.progressPercent) };
  } else {
    res.status(400).json({ error: "Invalid status." });
    return;
  }

  const updated = await prisma.courseAssignment.update({
    where: { id: assignment.id },
    data: {
      ...next,
      completedAt:
        next.status === "completed" ? assignment.completedAt ?? new Date() : null,
    },
  });
  res.json({
    id: updated.id,
    status: updated.status,
    progressPercent: updated.progressPercent,
  });
});
