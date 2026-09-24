import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE_NAME, verifySession } from "../lib/session";
import { prisma } from "../lib/prisma";
import { computeState } from "../services/subscription";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  const session = token ? verifySession(token) : null;
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Looked up fresh (not trusted from the JWT) so a faculty promotion takes
  // effect immediately, without waiting for the cookie to be re-signed.
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true },
  });
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  req.user = {
    id: user.id,
    role: user.role as "STUDENT" | "FACULTY" | "COLLEGE_ADMIN",
  };
  next();
}

/** Mount after requireAuth. Rejects anyone whose account isn't FACULTY. */
export function requireFaculty(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "FACULTY") {
    res.status(403).json({ error: "Faculty access only." });
    return;
  }
  next();
}

/** Mount after requireFaculty. Faculty provisioned by a college lose access
 * once that college's plan has expired (free trial and grace period over,
 * still unpaid). Faculty with no college -- self-registered with the invite
 * code -- aren't tied to a plan, so they pass. */
export async function requireCollegePlan(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const me = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { collegeId: true },
  });
  if (me?.collegeId) {
    const subscription = await prisma.subscription.findUnique({
      where: { collegeId: me.collegeId },
    });
    if (subscription && computeState(subscription).phase === "expired") {
      res.status(402).json({
        error:
          "Your college's plan has expired. Ask your placement cell (TPO) to activate it to continue.",
        code: "PLAN_EXPIRED",
      });
      return;
    }
  }
  next();
}

/** Mount after requireAuth. Rejects anyone whose account isn't COLLEGE_ADMIN. */
export function requireCollegeAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "COLLEGE_ADMIN") {
    res.status(403).json({ error: "College admin access only." });
    return;
  }
  next();
}
