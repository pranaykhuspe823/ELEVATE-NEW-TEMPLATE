import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { findOwnedFixSuggestion } from "../lib/ownership";

export const fixSuggestionActionsRouter = Router();
fixSuggestionActionsRouter.use(requireAuth);

fixSuggestionActionsRouter.patch("/:id", async (req, res) => {
  const owned = await findOwnedFixSuggestion(req.user!.id, req.params.id);
  if (!owned) {
    res.status(404).json({ error: "Fix suggestion not found." });
    return;
  }
  const { accepted } = req.body as { accepted?: boolean };
  if (typeof accepted !== "boolean") {
    res.status(400).json({ error: "accepted boolean is required." });
    return;
  }
  try {
    const suggestion = await prisma.fixSuggestion.update({
      where: { id: req.params.id },
      data: { accepted },
    });
    res.json({ id: suggestion.id, accepted: suggestion.accepted });
  } catch {
    res.status(404).json({ error: "Fix suggestion not found." });
  }
});
