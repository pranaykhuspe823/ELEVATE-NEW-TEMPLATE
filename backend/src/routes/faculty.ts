import { Router } from "express";
import fetch from "node-fetch";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCollegePlan, requireFaculty } from "../middleware/auth";
import { findFacultyStudent } from "../lib/ownership";
import { buildResources } from "../services/coursePlanGeneration";
import {
  PLAGIARISM_SIMILARITY_THRESHOLD,
  resolveCollegeId,
} from "../services/plagiarismCheck";
import { parseChosenResources, searchCourses } from "../services/courseSearch";
import { getFit, latestParsedResumes } from "../services/campusDrives";

export const facultyRouter = Router();
facultyRouter.use(requireAuth, requireFaculty, requireCollegePlan);

/** Roster: every student linked to this faculty member, with just enough
 * signal to triage who needs attention (latest ATS score, whether they've
 * taken a test yet, how many topics they're weak on, open assignments). */
facultyRouter.get("/students", async (req, res) => {
  const students = await prisma.user.findMany({
    where: { facultyId: req.user!.id },
    orderBy: { createdAt: "desc" },
  });

  const rows = await Promise.all(
    students.map(async (student) => {
      const resume = await prisma.resume.findFirst({
        where: { userId: student.id },
        orderBy: { uploadedAt: "desc" },
      });

      let atsScore: number | null = null;
      let detectedField: string | null = null;
      let weakTopicCount = 0;
      let latestTestId: string | null = null;
      let plagiarismFlagged = false;

      if (resume) {
        const [score, analysis, test, plagiarismCount] = await Promise.all([
          prisma.atsScore.findFirst({
            where: { resumeId: resume.id },
            orderBy: { createdAt: "desc" },
          }),
          prisma.analysis.findFirst({
            where: { resumeId: resume.id },
            orderBy: { createdAt: "desc" },
          }),
          prisma.test.findFirst({
            where: { resumeId: resume.id },
            orderBy: { createdAt: "desc" },
          }),
          prisma.plagiarismCheck.count({
            where: { resumeId: resume.id, reviewStatus: { not: "cleared" } },
          }),
        ]);
        atsScore = score?.totalScore ?? null;
        detectedField = analysis?.detectedField ?? null;
        latestTestId = test?.id ?? null;
        plagiarismFlagged = plagiarismCount > 0;

        if (test) {
          const attempt = await prisma.testAttempt.findFirst({
            where: { testId: test.id, completedAt: { not: null } },
            orderBy: { completedAt: "desc" },
          });
          if (attempt?.topicBreakdownJson) {
            const breakdown = JSON.parse(attempt.topicBreakdownJson) as Record<
              string,
              { correct: number; total: number }
            >;
            weakTopicCount = Object.values(breakdown).filter(
              (t) => t.total > 0 && t.correct / t.total < 0.75
            ).length;
          }
        }
      }

      const openAssignments = await prisma.courseAssignment.count({
        where: { studentId: student.id, status: { not: "completed" } },
      });

      return {
        id: student.id,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatarUrl,
        hasResume: !!resume,
        atsScore,
        detectedField,
        weakTopicCount,
        latestTestId,
        openAssignments,
        plagiarismFlagged,
      };
    })
  );

  res.json({ students: rows });
});

/** Course lookup for the "assign a course" box: real catalog results
 * (Microsoft Learn always, YouTube when a key is configured) plus search
 * links for platforms with no public API. */
facultyRouter.get("/course-search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2 || q.length > 100) {
    res.status(400).json({ error: "Search must be 2-100 characters." });
    return;
  }
  res.json(await searchCourses(q));
});

/** Faculty's own invite code, so the dashboard can show/share it. */
facultyRouter.get("/me", async (req, res) => {
  const me = await prisma.user.findUnique({ where: { id: req.user!.id } });
  res.json({ facultyCode: me?.facultyCode ?? null });
});

/** Certifications this faculty member has earned on Core5 Campus (a
 * separate product with its own accounts), looked up server-to-server by
 * email. Fails soft to an empty list -- Core5 Campus being unconfigured or
 * unreachable shouldn't break the faculty dashboard. */
facultyRouter.get("/certifications", async (req, res) => {
  const baseUrl = process.env.CORE5CAMPUS_API_URL;
  const serviceKey = process.env.CORE5CAMPUS_SERVICE_KEY;
  if (!baseUrl || !serviceKey) {
    res.json({ certificates: [], configured: false });
    return;
  }

  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true },
  });
  if (!me) {
    res.json({ certificates: [], configured: true });
    return;
  }

  try {
    const response = await fetch(
      `${baseUrl}/api/service/certificates?email=${encodeURIComponent(me.email)}`,
      { headers: { "X-Service-Key": serviceKey } }
    );
    if (!response.ok) {
      res.json({ certificates: [], configured: true });
      return;
    }
    const data = (await response.json()) as { certificates?: unknown[] };
    res.json({ certificates: data.certificates ?? [], configured: true });
  } catch {
    res.json({ certificates: [], configured: true });
  }
});

/** One student's full picture: resume/ATS/field, weak topics from their
 * latest completed test, the AI's own suggested modules (to pick from), and
 * whatever's already been assigned to them. */
facultyRouter.get("/students/:id", async (req, res) => {
  const student = await findFacultyStudent(req.user!.id, req.params.id);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }

  const resume = await prisma.resume.findFirst({
    where: { userId: student.id },
    orderBy: { uploadedAt: "desc" },
  });

  let atsScore: number | null = null;
  let detectedField: string | null = null;
  let weakTopics: { topic: string; correct: number; total: number }[] = [];
  let suggestedModules: {
    id: string;
    title: string;
    topic: string;
    priority: string;
    estimatedHours: number;
  }[] = [];

  if (resume) {
    const [score, analysis, test] = await Promise.all([
      prisma.atsScore.findFirst({
        where: { resumeId: resume.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.analysis.findFirst({
        where: { resumeId: resume.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.test.findFirst({
        where: { resumeId: resume.id },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    atsScore = score?.totalScore ?? null;
    detectedField = analysis?.detectedField ?? null;

    if (test) {
      const attempt = await prisma.testAttempt.findFirst({
        where: { testId: test.id, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        include: { coursePlans: { include: { modules: true } } },
      });
      if (attempt?.topicBreakdownJson) {
        const breakdown = JSON.parse(attempt.topicBreakdownJson) as Record<
          string,
          { correct: number; total: number }
        >;
        weakTopics = Object.entries(breakdown)
          .filter(([, t]) => t.total > 0 && t.correct / t.total < 0.75)
          .map(([topic, t]) => ({ topic, ...t }));
      }
      const latestPlan = attempt?.coursePlans[attempt.coursePlans.length - 1];
      if (latestPlan) {
        suggestedModules = latestPlan.modules.map((m) => ({
          id: m.id,
          title: m.title,
          topic: m.topic,
          priority: m.priority,
          estimatedHours: m.estimatedHours,
        }));
      }
    }
  }

  const assignments = await prisma.courseAssignment.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
  });

  const facultyWeakTopics = await prisma.facultyWeakTopic.findMany({
    where: { studentId: student.id, addedById: req.user!.id },
    orderBy: { createdAt: "asc" },
  });

  res.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      avatarUrl: student.avatarUrl,
    },
    atsScore,
    detectedField,
    plagiarismScore: resume?.plagiarismScore ?? null,
    plagiarismThreshold: PLAGIARISM_SIMILARITY_THRESHOLD,
    resumeUploadedAt: resume?.uploadedAt ?? null,
    weakTopics,
    facultyWeakTopics: facultyWeakTopics.map((t) => ({
      id: t.id,
      topic: t.topic,
      note: t.note,
    })),
    suggestedModules,
    assignments: assignments.map((a) => ({
      id: a.id,
      title: a.title,
      topic: a.topic,
      priority: a.priority,
      estimatedHours: a.estimatedHours,
      reason: a.reason,
      status: a.status,
      createdAt: a.createdAt,
    })),
  });
});

/** Full plagiarism-match detail for a student's latest resume. Only matches
 * within the requesting faculty's own college are de-anonymized (name +
 * explanation); anything outside it is redacted the same as what the
 * uploading student themself sees. */
facultyRouter.get("/students/:id/plagiarism", async (req, res) => {
  const student = await findFacultyStudent(req.user!.id, req.params.id);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }

  const resume = await prisma.resume.findFirst({
    where: { userId: student.id },
    orderBy: { uploadedAt: "desc" },
  });
  if (!resume) {
    res.json({ matches: [] });
    return;
  }

  const myCollegeId = await resolveCollegeId(req.user!.id);

  const checks = await prisma.plagiarismCheck.findMany({
    where: { resumeId: resume.id },
    orderBy: { similarityScore: "desc" },
    include: { matchedResume: { include: { user: true } } },
  });

  const matches = await Promise.all(
    checks.map(async (check) => {
      const matchedCollegeId = await resolveCollegeId(check.matchedResume.userId);
      const sameCollege = myCollegeId !== null && matchedCollegeId === myCollegeId;
      return {
        id: check.id,
        reviewStatus: check.reviewStatus,
        facultyNote: check.facultyNote,
        similarityScore: check.similarityScore,
        source: check.source,
        matchedStudentName: sameCollege
          ? check.matchedResume.user.name ?? check.matchedResume.user.email
          : null,
        explanation: sameCollege ? check.explanation : null,
        overlap:
          sameCollege && check.overlapJson
            ? (JSON.parse(check.overlapJson) as {
                yours: string;
                theirs: string;
                similarity: number;
              }[])
            : [],
        redacted: !sameCollege,
      };
    })
  );

  res.json({ matches });
});

/** How one of this faculty's students fits each upcoming campus drive at
 * their college -- the missing skills are the gaps worth assigning courses for. */
facultyRouter.get("/students/:id/drive-fits", async (req, res) => {
  const student = await findFacultyStudent(req.user!.id, req.params.id);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  const collegeId = await resolveCollegeId(req.user!.id);
  const resume = (await latestParsedResumes([student.id])).get(student.id);
  if (!collegeId || !resume) {
    res.json({ hasResume: !!resume, fits: [] });
    return;
  }

  const drives = await prisma.campusDrive.findMany({
    where: { collegeId, status: "upcoming" },
    orderBy: { driveDate: "asc" },
  });
  const fits = await Promise.all(
    drives.map(async (d) => {
      try {
        const fit = await getFit(d, resume);
        return {
          driveId: d.id,
          companyName: d.companyName,
          roleTitle: d.roleTitle,
          driveDate: d.driveDate,
          score: fit.score,
          missing: fit.missing,
        };
      } catch {
        return null;
      }
    })
  );
  res.json({ hasResume: true, fits: fits.filter((f) => f !== null) });
});

/** Faculty-added weak topics: the computed ones come from the student's
 * test and can't be edited, so these sit alongside them. */
facultyRouter.post("/students/:id/weak-topics", async (req, res) => {
  const student = await findFacultyStudent(req.user!.id, req.params.id);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }
  const { topic, note } = req.body as { topic?: string; note?: string };
  if (!topic?.trim()) {
    res.status(400).json({ error: "topic is required." });
    return;
  }
  const created = await prisma.facultyWeakTopic.create({
    data: {
      studentId: student.id,
      addedById: req.user!.id,
      topic: topic.trim(),
      note: note?.trim() || null,
    },
  });
  res.status(201).json({ id: created.id });
});

facultyRouter.patch("/weak-topics/:id", async (req, res) => {
  const existing = await prisma.facultyWeakTopic.findUnique({
    where: { id: req.params.id },
  });
  if (!existing || existing.addedById !== req.user!.id) {
    res.status(404).json({ error: "Weak topic not found." });
    return;
  }
  const { topic, note } = req.body as { topic?: string; note?: string };
  if (topic !== undefined && !topic.trim()) {
    res.status(400).json({ error: "topic can't be empty." });
    return;
  }
  await prisma.facultyWeakTopic.update({
    where: { id: existing.id },
    data: {
      ...(topic !== undefined ? { topic: topic.trim() } : {}),
      ...(note !== undefined ? { note: note.trim() || null } : {}),
    },
  });
  res.json({ ok: true });
});

facultyRouter.delete("/weak-topics/:id", async (req, res) => {
  const existing = await prisma.facultyWeakTopic.findUnique({
    where: { id: req.params.id },
  });
  if (!existing || existing.addedById !== req.user!.id) {
    res.status(404).json({ error: "Weak topic not found." });
    return;
  }
  await prisma.facultyWeakTopic.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

/** Faculty's review of a flagged match: mark it a false positive ("cleared"),
 * confirm it, and/or leave a note. Cleared matches stop counting as flags. */
facultyRouter.patch("/plagiarism/:id", async (req, res) => {
  const check = await prisma.plagiarismCheck.findUnique({
    where: { id: req.params.id },
    include: { resume: true },
  });
  const student = check
    ? await findFacultyStudent(req.user!.id, check.resume.userId)
    : null;
  if (!check || !student) {
    res.status(404).json({ error: "Match not found." });
    return;
  }
  const { reviewStatus, facultyNote } = req.body as {
    reviewStatus?: string;
    facultyNote?: string;
  };
  if (
    reviewStatus !== undefined &&
    !["open", "cleared", "confirmed"].includes(reviewStatus)
  ) {
    res.status(400).json({ error: "Invalid review status." });
    return;
  }
  await prisma.plagiarismCheck.update({
    where: { id: check.id },
    data: {
      ...(reviewStatus !== undefined ? { reviewStatus } : {}),
      ...(facultyNote !== undefined
        ? { facultyNote: facultyNote.trim() || null }
        : {}),
    },
  });
  res.json({ ok: true });
});

/** Assign a course to a student -- either copy one of the AI's suggested
 * modules (pass sourceModuleId) or write a custom one (pass title/topic). */
facultyRouter.post("/students/:id/assignments", async (req, res) => {
  const student = await findFacultyStudent(req.user!.id, req.params.id);
  if (!student) {
    res.status(404).json({ error: "Student not found." });
    return;
  }

  const body = req.body as {
    sourceModuleId?: string;
    title?: string;
    topic?: string;
    priority?: "high" | "medium" | "low";
    estimatedHours?: number;
    reason?: string;
    resources?: unknown;
  };

  let chosenResources: ReturnType<typeof parseChosenResources> = [];
  if (body.resources !== undefined) {
    chosenResources = parseChosenResources(body.resources);
    if (!chosenResources) {
      res.status(400).json({ error: "resources must be http(s) links." });
      return;
    }
  }

  let title = body.title?.trim();
  let topic = body.topic?.trim();
  let priority = body.priority ?? "medium";
  let estimatedHours = body.estimatedHours ?? 2;
  let resourcesJson = "[]";

  if (body.sourceModuleId) {
    const source = await prisma.courseModule.findUnique({
      where: { id: body.sourceModuleId },
    });
    if (!source) {
      res.status(404).json({ error: "Suggested module not found." });
      return;
    }
    title = source.title;
    topic = source.topic;
    priority = source.priority as "high" | "medium" | "low";
    estimatedHours = source.estimatedHours;
    resourcesJson = source.resourcesJson;
  }

  if (!title || !topic) {
    res.status(400).json({
      error: "title and topic are required (or pass sourceModuleId).",
    });
    return;
  }

  // Custom (non-AI-sourced) assignments still get real search-result links,
  // same as AI-suggested modules -- so a student never sees an assignment
  // with nowhere to actually go learn it.
  // A course picked from search results goes first, ahead of the generic
  // search links, so the student's first tap is the exact course.
  if (!body.sourceModuleId) {
    resourcesJson = JSON.stringify([
      ...(chosenResources ?? []),
      ...buildResources(title),
    ]);
  }

  const assignment = await prisma.courseAssignment.create({
    data: {
      studentId: student.id,
      assignedById: req.user!.id,
      sourceModuleId: body.sourceModuleId ?? null,
      title,
      topic,
      priority,
      estimatedHours,
      resourcesJson,
      reason: body.reason?.trim() || null,
    },
  });

  res.status(201).json({ id: assignment.id });
});

/** Faculty can retract an assignment or nudge its status. */
facultyRouter.patch("/assignments/:id", async (req, res) => {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: req.params.id },
  });
  if (!assignment || assignment.assignedById !== req.user!.id) {
    res.status(404).json({ error: "Assignment not found." });
    return;
  }
  const { status, title, topic, priority, estimatedHours, reason } = req.body as {
    status?: string;
    title?: string;
    topic?: string;
    priority?: string;
    estimatedHours?: number;
    reason?: string;
  };
  if (status && !["assigned", "in_progress", "completed"].includes(status)) {
    res.status(400).json({ error: "Invalid status." });
    return;
  }
  if (priority !== undefined && !["high", "medium", "low"].includes(priority)) {
    res.status(400).json({ error: "Invalid priority." });
    return;
  }
  if (title !== undefined && !title.trim()) {
    res.status(400).json({ error: "title can't be empty." });
    return;
  }
  if (topic !== undefined && !topic.trim()) {
    res.status(400).json({ error: "topic can't be empty." });
    return;
  }
  if (
    estimatedHours !== undefined &&
    (typeof estimatedHours !== "number" || !(estimatedHours > 0))
  ) {
    res.status(400).json({ error: "estimatedHours must be a positive number." });
    return;
  }

  const newTitle = title?.trim();
  // Assignments written from scratch get search links built from their title;
  // AI-sourced ones keep the resources they were copied with.
  // A specific course faculty picked (its resource has a title) is kept as-is.
  const hasChosenCourse = (JSON.parse(assignment.resourcesJson) as { title?: string }[])
    .some((r) => r.title);
  const rebuildResources =
    newTitle !== undefined &&
    newTitle !== assignment.title &&
    assignment.sourceModuleId === null &&
    !hasChosenCourse;

  const updated = await prisma.courseAssignment.update({
    where: { id: assignment.id },
    data: {
      ...(status ? { status } : {}),
      ...(status === "completed" ? { completedAt: new Date() } : {}),
      ...(newTitle !== undefined ? { title: newTitle } : {}),
      ...(topic !== undefined ? { topic: topic.trim() } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(estimatedHours !== undefined ? { estimatedHours } : {}),
      ...(reason !== undefined ? { reason: reason.trim() || null } : {}),
      ...(rebuildResources
        ? { resourcesJson: JSON.stringify(buildResources(newTitle)) }
        : {}),
    },
  });
  res.json({ id: updated.id, status: updated.status });
});

facultyRouter.delete("/assignments/:id", async (req, res) => {
  const assignment = await prisma.courseAssignment.findUnique({
    where: { id: req.params.id },
  });
  if (!assignment || assignment.assignedById !== req.user!.id) {
    res.status(404).json({ error: "Assignment not found." });
    return;
  }
  await prisma.courseAssignment.delete({ where: { id: assignment.id } });
  res.json({ ok: true });
});
