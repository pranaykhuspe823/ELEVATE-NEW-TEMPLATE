import type { PlanBlock } from "../lib/orgAccess";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "STUDENT" | "FACULTY" | "COLLEGE_ADMIN" };
      /** Set by requireAuth when the user's college plan has ended. */
      planBlock?: PlanBlock | null;
    }
  }
}

export {};
