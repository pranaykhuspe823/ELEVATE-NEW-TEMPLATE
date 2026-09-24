import { Router } from "express";
import { analyzeImageStructured } from "../lib/llm";
import { PROCTOR_SYSTEM_PROMPT, ProctorCheckSchema } from "../schemas/proctor";
import { requireAuth } from "../middleware/auth";
import { findOwnedTest } from "../lib/ownership";

export const proctorRouter = Router();
proctorRouter.use(requireAuth);

proctorRouter.post("/:id/proctor-check", async (req, res) => {
  const test = await findOwnedTest(req.user!.id, req.params.id);
  if (!test) {
    res.status(404).json({ error: "Test not found." });
    return;
  }

  const { image } = req.body as { image?: string };
  if (!image || !image.startsWith("data:image/")) {
    res.status(400).json({ error: "A base64 image data URL is required." });
    return;
  }

  try {
    const result = await analyzeImageStructured(
      ProctorCheckSchema,
      PROCTOR_SYSTEM_PROMPT,
      image
    );
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: (err as Error).message });
  }
});
