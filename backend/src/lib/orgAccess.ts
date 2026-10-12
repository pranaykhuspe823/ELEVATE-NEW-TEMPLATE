import { prisma } from "./prisma";
import { computeState } from "../services/subscription";

export type PlanBlock =
  /** The college admin (TPO): signed in, but may only reach billing. */
  | { code: "PLAN_REQUIRED"; error: string }
  /** Faculty and students of that college: no access at all. */
  | { code: "ORG_PLAN_EXPIRED"; error: string };

export const ORG_PLAN_EXPIRED_MESSAGE =
  "Your organisation's plan has ended. Ask your college's placement cell (TPO) to purchase a plan to continue.";

/** Whether this user's organisation has lost access: its free trial ended
 * (or paid term lapsed) without payment. A college admin and its faculty
 * belong to the college directly; a student belongs to the college of the
 * faculty member they linked to. Users with no college -- unlinked students,
 * self-registered faculty -- are never blocked. */
export async function planBlockFor(userId: string): Promise<PlanBlock | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, collegeId: true, faculty: { select: { collegeId: true } } },
  });
  if (!user) return null;
  const collegeId = user.role === "STUDENT" ? user.faculty?.collegeId : user.collegeId;
  if (!collegeId) return null;

  const subscription = await prisma.subscription.findUnique({ where: { collegeId } });
  const phase = subscription ? computeState(subscription).phase : "expired";
  if (phase !== "expired" && phase !== "cancelled") return null;

  if (user.role === "COLLEGE_ADMIN") {
    return {
      code: "PLAN_REQUIRED",
      error: "Your 7-day free trial has ended. Purchase a plan to continue using Elevate.",
    };
  }
  return { code: "ORG_PLAN_EXPIRED", error: ORG_PLAN_EXPIRED_MESSAGE };
}

/** What a blocked college admin can still reach: their account, and
 * everything needed to look at plans and pay. */
const ADMIN_ALLOWED = [
  /^\/api\/auth\/(me|logout)$/,
  /^\/api\/colleges\/(me|plans|subscribe|payments)$/,
  /^\/api\/colleges\/subscription\/(order|verify)$/,
];
/** Blocked faculty / students: just enough to see why and sign out. */
const MEMBER_ALLOWED = [/^\/api\/auth\/(me|logout)$/];

export function allowedWhileBlocked(block: PlanBlock, path: string): boolean {
  const list = block.code === "PLAN_REQUIRED" ? ADMIN_ALLOWED : MEMBER_ALLOWED;
  return list.some((re) => re.test(path));
}
