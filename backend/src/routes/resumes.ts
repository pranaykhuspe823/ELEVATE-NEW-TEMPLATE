import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";
import { processResume } from "../services/resumeProcessing";
import { generateTest } from "../services/testGeneration";
import { generateFixSuggestions } from "../services/fixSuggestions";
import { startInterview } from "../services/interviewService";
import { requireAuth } from "../middleware/auth";
import { findOwnedResume } from "../lib/ownership";
import { PLAGIARISM_SIMILARITY_THRESHOLD } from "../services/plagiarismCheck";

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("UNSUPPORTED_FILE_TYPE"));
      return;
    }
    cb(null, true);
  },
});

export const resumesRouter = Router();
resumesRouter.use(requireAuth);

resumesRouter.post("/upload", (req, res) => {
  upload.single("resume")(req, res, async (err) => {
    if (err) {
      const message =
        err.message === "UNSUPPORTED_FILE_TYPE"
          ? "Only PDF or DOCX files are supported."
          : err.code === "LIMIT_FILE_SIZE"
          ? "File exceeds the 10MB limit."
          : "Upload failed.";
      res.status(400).json({ error: message });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No file provided." });
      return;
    }

    try {
      const ext =
        path.extname(req.file.originalname) ||
        (req.file.mimetype === "application/pdf" ? ".pdf" : ".docx");
      const storedFilename = `${crypto.randomUUID()}${ext}`;
      const rawFilePath = await storage.save(req.file.buffer, storedFilename);

      const resume = await prisma.resume.create({
        data: {
          userId: req.user!.id,
          filename: req.file.originalname,
          rawFilePath,
          status: "processing",
        },
      });

      processResume(resume.id, rawFilePath, req.file.originalname).catch(
        () => {}
      );

      res.status(201).json({ resumeId: resume.id });
    } catch {
      res.status(500).json({ error: "Failed to save resume." });
    }
  });
});

resumesRouter.get("/:id", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  res.json({
    id: resume.id,
    filename: resume.filename,
    uploadedAt: resume.uploadedAt,
    status: resume.status,
    processingError: resume.processingError,
    parsed: resume.parsedJson ? JSON.parse(resume.parsedJson) : null,
  });
});

/** Re-run the analysis of a resume that failed (e.g. the AI service was busy),
 * on the file that's already stored -- no need to upload it again. */
resumesRouter.post("/:id/retry", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  if (resume.status !== "failed") {
    res.status(409).json({ error: "Only a failed analysis can be retried." });
    return;
  }
  if (!fs.existsSync(path.resolve(resume.rawFilePath))) {
    res.status(410).json({ error: "The uploaded file is no longer stored. Please upload your resume again." });
    return;
  }
  // Drop whatever a half-finished run left behind; the retry writes it all fresh.
  await prisma.$transaction([
    prisma.analysis.deleteMany({ where: { resumeId: resume.id } }),
    prisma.atsScore.deleteMany({ where: { resumeId: resume.id } }),
    prisma.resume.update({
      where: { id: resume.id },
      data: { status: "processing", processingError: null },
    }),
  ]);
  processResume(resume.id, resume.rawFilePath, resume.filename).catch(() => {});
  res.json({ status: "processing" });
});

resumesRouter.get("/:id/file", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  res.sendFile(path.resolve(resume.rawFilePath), (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: "Resume file not found on disk." });
    }
  });
});

resumesRouter.get("/:id/analysis", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  const analysis = await prisma.analysis.findFirst({
    where: { resumeId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  if (!analysis) {
    res.status(404).json({ error: "Analysis not available yet." });
    return;
  }
  res.json({
    detectedField: analysis.detectedField,
    secondaryFields: JSON.parse(analysis.secondaryFields),
    seniority: analysis.seniority,
    confidence: analysis.confidence,
    reasoning: analysis.reasoning,
  });
});

resumesRouter.get("/:id/ats-score", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  const score = await prisma.atsScore.findFirst({
    where: { resumeId: req.params.id },
    orderBy: { createdAt: "desc" },
  });
  if (!score) {
    res.status(404).json({ error: "ATS score not available yet." });
    return;
  }
  res.json({
    totalScore: score.totalScore,
    formattingScore: score.formattingScore,
    keywordScore: score.keywordScore,
    impactScore: score.impactScore,
    structureScore: score.structureScore,
    breakdown: JSON.parse(score.breakdownJson),
  });
});

/** Deliberately anonymous: the uploader gets their overall similarity and
 * whether it crosses the flag threshold, but never who they match or why --
 * only faculty/college-admin views resolve the real match. */
resumesRouter.get("/:id/plagiarism", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  const score = resume.plagiarismScore;
  // Matches a faculty member has cleared as false positives no longer flag.
  const openMatches = await prisma.plagiarismCheck.count({
    where: { resumeId: resume.id, reviewStatus: { not: "cleared" } },
  });
  res.json({
    checked: score !== null,
    similarityPercent: score === null ? null : Math.round(score * 100),
    flagged:
      score !== null &&
      score >= PLAGIARISM_SIMILARITY_THRESHOLD &&
      openMatches > 0,
  });
});

resumesRouter.post("/:id/generate-test", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  try {
    const result = await generateTest(req.params.id);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

resumesRouter.post("/:id/start-interview", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  const { targetRole } = req.body as { targetRole?: string };
  try {
    const result = await startInterview(req.params.id, targetRole);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

resumesRouter.post("/:id/fix-suggestions", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  try {
    const suggestions = await generateFixSuggestions(req.params.id);
    res.status(201).json({
      suggestions: suggestions.map((s) => ({
        id: s.id,
        section: s.section,
        originalText: s.originalText,
        suggestedText: s.suggestedText,
        accepted: s.accepted,
      })),
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

resumesRouter.get("/:id/fix-suggestions", async (req, res) => {
  const resume = await findOwnedResume(req.user!.id, req.params.id);
  if (!resume) {
    res.status(404).json({ error: "Resume not found." });
    return;
  }
  const suggestions = await prisma.fixSuggestion.findMany({
    where: { resumeId: req.params.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({
    suggestions: suggestions.map((s) => ({
      id: s.id,
      section: s.section,
      originalText: s.originalText,
      suggestedText: s.suggestedText,
      accepted: s.accepted,
    })),
  });
});
