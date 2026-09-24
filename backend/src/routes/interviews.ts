import { Router } from "express";
import multer from "multer";
import { transcribeAudio } from "../lib/llm";
import { submitTurn, evaluateInterview } from "../services/interviewService";
import { requireAuth } from "../middleware/auth";
import { findOwnedInterview } from "../lib/ownership";
import type { TranscriptTurn } from "../schemas/interview";

const MAX_AUDIO_SIZE_BYTES = 15 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE_BYTES },
});

export const interviewsRouter = Router();
interviewsRouter.use(requireAuth);

interviewsRouter.get("/:id", async (req, res) => {
  const interview = await findOwnedInterview(req.user!.id, req.params.id);
  if (!interview) {
    res.status(404).json({ error: "Interview not found." });
    return;
  }
  res.json({
    id: interview.id,
    resumeId: interview.resumeId,
    targetRole: interview.targetRole,
    status: interview.status,
    transcript: JSON.parse(interview.transcriptJson) as TranscriptTurn[],
    overallScore: interview.overallScore,
    communicationScore: interview.communicationScore,
    technicalDepthScore: interview.technicalDepthScore,
    resumeConsistencyScore: interview.resumeConsistencyScore,
    confidenceScore: interview.confidenceScore,
    feedback: interview.feedbackJson ? JSON.parse(interview.feedbackJson) : null,
    recommendation: interview.recommendation,
    recommendationReason: interview.recommendationReason,
    detailedFeedback: interview.detailedFeedback,
  });
});

interviewsRouter.post("/:id/turn", (req, res) => {
  upload.single("audio")(req, res, async (err) => {
    if (err) {
      res.status(400).json({ error: "Audio upload failed." });
      return;
    }
    const interview = await findOwnedInterview(req.user!.id, req.params.id);
    if (!interview) {
      res.status(404).json({ error: "Interview not found." });
      return;
    }

    try {
      let candidateText: string;
      if (req.file) {
        candidateText = await transcribeAudio(req.file.buffer, req.file.mimetype);
      } else {
        const { text } = req.body as { text?: string };
        if (!text || !text.trim()) {
          res.status(400).json({ error: "Audio file or text is required." });
          return;
        }
        candidateText = text;
      }

      const result = await submitTurn(req.params.id, candidateText);
      res.status(201).json({ candidateText, ...result });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });
});

interviewsRouter.post("/:id/end", async (req, res) => {
  const interview = await findOwnedInterview(req.user!.id, req.params.id);
  if (!interview) {
    res.status(404).json({ error: "Interview not found." });
    return;
  }
  try {
    const updated = await evaluateInterview(req.params.id);
    res.status(201).json({
      overallScore: updated.overallScore,
      communicationScore: updated.communicationScore,
      technicalDepthScore: updated.technicalDepthScore,
      resumeConsistencyScore: updated.resumeConsistencyScore,
      confidenceScore: updated.confidenceScore,
      feedback: updated.feedbackJson ? JSON.parse(updated.feedbackJson) : null,
      recommendation: updated.recommendation,
      recommendationReason: updated.recommendationReason,
      detailedFeedback: updated.detailedFeedback,
    });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});
