import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

export const assignmentsRouter = Router();
assignmentsRouter.use(requireAuth);

/** Everything a faculty member has assigned to the current user, newest
 * first. Merges with (but is separate from) the AI-auto-generated course
 * plan modules -- a module is either AI-suggested or faculty-assigned, and
 * this endpoint only covers the latter. */
assignmentsRouter.get("/me", async (req, res) => {
  const assignments = await prisma.courseAssignment.findMany({
    where: { studentId: req.user!.id },
    orderBy: { createdAt: "desc" },
    include: { assignedBy: { select: { name: true, email: true } } },
  });
  res.json({
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      topic: a.topic,
      priority: a.priority,
      estimatedHours: a.estimatedHours,
      resources: JSON.parse(a.resourcesJson),
      reason: a.reason,
      status: a.status,
      assignedBy: a.assignedBy.name ?? a.assignedBy.email,
      createdAt: a.createdAt,
    })),
  });
});

/** Student marks their own progress on something a faculty member assigned. */
assignmentsRouter.patch("/:id", async (req, res) => {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: req.params.id },
  });
  if (!assignment || assignment.studentId !== req.user!.id) {
    res.status(404).json({ error: "Assignment not found." });
    return;
  }
  const { status } = req.body as { status?: string };
  if (!status || !["assigned", "in_progress", "completed"].includes(status)) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  const updated = await prisma.courseAssignment.update({
    where: { id: assignment.id },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });
  res.json({ id: updated.id, status: updated.status });
});
