import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { CampusDrive } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireCollegeAdmin } from "../middleware/auth";
import { computeState } from "../services/subscription";
import { resolveCollegeId } from "../services/plagiarismCheck";
import { searchCourses } from "../services/courseSearch";
import {
  MatchServiceError,
  cleanSkills,
  extractSkillsFromDescription,
  generateTips,
  getFit,
  latestParsedResumes,
  matchSkills,
  parseSkills,
  resumeSearchText,
  scoreOf,
  suggestForRole,
  toDriveDto,
} from "../services/campusDrives";

export const drivesRouter = Router();
drivesRouter.use(requireAuth);

type Role = "STUDENT" | "FACULTY" | "COLLEGE_ADMIN";

const collapse = (v: string) => v.replace(/\s+/g, " ");

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((v) => collapse(v) || null)
    .nullable()
    .optional();

const singleLine = (label: string, max: number) =>
  z
    .string({ required_error: `${label} is required.`, invalid_type_error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} is too long.`)
    .transform(collapse);

const DriveBody = z.object({
  companyName: singleLine("Company name", 120),
  roleTitle: singleLine("Role", 120),
  description: z
    .string({ required_error: "Paste the job description.", invalid_type_error: "Paste the job description." })
    .trim()
    .min(20, "Paste the job description (at least a couple of lines).")
    .max(8000, "The job description is too long (8000 characters max)."),
  requiredSkills: z.array(z.string()).max(60).optional(),
  driveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must look like 2026-10-15.")
    .nullable()
    .optional(),
  location: optionalText(120),
  ctc: optionalText(120),
  status: z.enum(["upcoming", "completed"]).optional(),
});

/** A date-only value stored at noon UTC, so it shows as the same calendar day
 * in every timezone from UTC-12 to UTC+11. */
function toDriveDate(value: string | null | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

interface Ctx {
  userId: string;
  role: Role;
  collegeId: string | null;
}

async function getCtx(req: Request): Promise<Ctx> {
  return {
    userId: req.user!.id,
    role: req.user!.role,
    collegeId: await resolveCollegeId(req.user!.id),
  };
}

/** Expired plans lock everyone but the admin (who can still look, but not
 * change anything, until they pay). Returns the message to send, or null. */
async function planBlock(collegeId: string, role: Role, write: boolean): Promise<string | null> {
  const subscription = await prisma.subscription.findUnique({ where: { collegeId } });
  if (!subscription) return null;
  const phase = computeState(subscription).phase;
  if (phase !== "expired" && phase !== "cancelled") return null;
  if (role === "COLLEGE_ADMIN") {
    return write ? "Your plan has expired. Activate the paid plan to manage campus drives." : null;
  }
  return "Your college's plan has expired. Ask your placement cell (TPO) to activate it to continue.";
}

function sendBlocked(res: Response, message: string) {
  res.status(402).json({ error: message, code: "PLAN_EXPIRED" });
}

function sortDrives(drives: CampusDrive[]): CampusDrive[] {
  const time = (d: CampusDrive) => d.driveDate?.getTime() ?? null;
  const upcoming = drives
    .filter((d) => d.status !== "completed")
    .sort((a, b) => (time(a) ?? Infinity) - (time(b) ?? Infinity));
  const completed = drives
    .filter((d) => d.status === "completed")
    .sort((a, b) => (time(b) ?? -Infinity) - (time(a) ?? -Infinity));
  return [...upcoming, ...completed];
}

function handleServiceError(err: unknown, res: Response) {
  if (err instanceof MatchServiceError) {
    res.status(502).json({ error: err.message });
    return;
  }
  console.error("Campus drives error:", err);
  res.status(500).json({ error: "Something went wrong. Please try again." });
}

/** Only drives belonging to the caller's own college are ever reachable. */
async function findDriveFor(ctx: Ctx, id: string): Promise<CampusDrive | null> {
  if (!ctx.collegeId) return null;
  const drive = await prisma.campusDrive.findUnique({ where: { id } });
  return drive && drive.collegeId === ctx.collegeId ? drive : null;
}

// --- course lookup (any signed-in role: it's public catalog data) -----------

drivesRouter.get("/course-search", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2 || q.length > 100) {
    res.status(400).json({ error: "Search must be 2-100 characters." });
    return;
  }
  res.json(await searchCourses(q));
});

// --- TPO: skill extraction ---------------------------------------------------

drivesRouter.post("/extract-skills", requireCollegeAdmin, async (req, res) => {
  const description = (req.body as { description?: unknown }).description;
  if (typeof description !== "string" || description.trim().length < 20) {
    res.status(400).json({ error: "Paste the job description first." });
    return;
  }
  try {
    const skills = await extractSkillsFromDescription(description);
    res.json({ skills });
  } catch (err) {
    console.error("Skill extraction failed:", err);
    res.status(502).json({
      error: "Couldn't extract skills automatically. You can type them in instead.",
    });
  }
});

/** "Draft with AI": a job description and tech stack for a role, so the TPO
 * doesn't start from a blank page. Nothing is saved -- it's a suggestion. */
drivesRouter.post("/suggest", requireCollegeAdmin, async (req, res) => {
  const parsed = z
    .object({
      companyName: z.string().trim().max(120).optional(),
      roleTitle: z
        .string({ required_error: "Enter the role first.", invalid_type_error: "Enter the role first." })
        .trim()
        .min(2, "Enter the role first.")
        .max(120, "Role is too long."),
      description: z.string().max(8000).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const { companyName, roleTitle, description } = parsed.data;
  try {
    res.json(await suggestForRole(companyName || undefined, collapse(roleTitle), description));
  } catch (err) {
    console.error("Drive suggestion failed:", err);
    res.status(502).json({ error: "Couldn't draft a suggestion right now. Please try again." });
  }
});

// --- list --------------------------------------------------------------------

drivesRouter.get("/", async (req, res) => {
  const ctx = await getCtx(req);
  if (!ctx.collegeId) {
    res.json({ linked: false, hasResume: false, drives: [] });
    return;
  }
  const blocked = await planBlock(ctx.collegeId, ctx.role, false);
  if (blocked) return sendBlocked(res, blocked);

  const drives = sortDrives(
    await prisma.campusDrive.findMany({ where: { collegeId: ctx.collegeId } })
  );

  if (ctx.role !== "STUDENT") {
    res.json({ linked: true, hasResume: false, drives: drives.map((d) => ({ ...toDriveDto(d), fit: null })) });
    return;
  }

  const resume = (await latestParsedResumes([ctx.userId])).get(ctx.userId);
  if (!resume) {
    res.json({ linked: true, hasResume: false, drives: drives.map((d) => ({ ...toDriveDto(d), fit: null })) });
    return;
  }

  let fitError = false;
  const rows = await Promise.all(
    drives.map(async (d) => {
      try {
        const fit = await getFit(d, resume);
        return { ...toDriveDto(d), fit: { score: fit.score, matched: fit.matched, missing: fit.missing } };
      } catch {
        fitError = true;
        return { ...toDriveDto(d), fit: null };
      }
    })
  );
  res.json({ linked: true, hasResume: true, fitError, drives: rows });
});

// --- create / update / delete (TPO) -----------------------------------------

drivesRouter.post("/", requireCollegeAdmin, async (req, res) => {
  const ctx = await getCtx(req);
  if (!ctx.collegeId) {
    res.status(404).json({ error: "No college found for this account." });
    return;
  }
  const blocked = await planBlock(ctx.collegeId, ctx.role, true);
  if (blocked) return sendBlocked(res, blocked);

  const parsed = DriveBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const body = parsed.data;

  let skills = cleanSkills(body.requiredSkills ?? []);
  if (skills.length === 0) {
    try {
      skills = await extractSkillsFromDescription(body.description);
    } catch (err) {
      console.error("Skill extraction failed:", err);
    }
  }
  if (skills.length === 0) {
    res.status(400).json({ error: "Add at least one required skill so students can be matched." });
    return;
  }

  const drive = await prisma.campusDrive.create({
    data: {
      collegeId: ctx.collegeId,
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      description: body.description,
      skillsJson: JSON.stringify(skills),
      driveDate: toDriveDate(body.driveDate) ?? null,
      location: body.location ?? null,
      ctc: body.ctc ?? null,
      status: body.status ?? "upcoming",
    },
  });
  res.status(201).json({ drive: toDriveDto(drive) });
});

drivesRouter.patch("/:id", requireCollegeAdmin, async (req, res) => {
  const ctx = await getCtx(req);
  const drive = await findDriveFor(ctx, req.params.id);
  if (!drive) {
    res.status(404).json({ error: "Drive not found." });
    return;
  }
  const blocked = await planBlock(drive.collegeId, ctx.role, true);
  if (blocked) return sendBlocked(res, blocked);

  const parsed = DriveBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const body = parsed.data;

  let skillsJson: string | undefined;
  if (body.requiredSkills !== undefined) {
    const skills = cleanSkills(body.requiredSkills);
    if (skills.length === 0) {
      res.status(400).json({ error: "Keep at least one required skill." });
      return;
    }
    skillsJson = JSON.stringify(skills);
  }

  const updated = await prisma.campusDrive.update({
    where: { id: drive.id },
    data: {
      ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
      ...(body.roleTitle !== undefined ? { roleTitle: body.roleTitle } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(skillsJson !== undefined ? { skillsJson } : {}),
      ...(body.driveDate !== undefined ? { driveDate: toDriveDate(body.driveDate) ?? null } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.ctc !== undefined ? { ctc: body.ctc } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });
  res.json({ drive: toDriveDto(updated) });
});

drivesRouter.delete("/:id", requireCollegeAdmin, async (req, res) => {
  const ctx = await getCtx(req);
  const drive = await findDriveFor(ctx, req.params.id);
  if (!drive) {
    res.status(404).json({ error: "Drive not found." });
    return;
  }
  const blocked = await planBlock(drive.collegeId, ctx.role, true);
  if (blocked) return sendBlocked(res, blocked);
  await prisma.campusDrive.delete({ where: { id: drive.id } });
  res.json({ ok: true });
});

// --- one drive ---------------------------------------------------------------

drivesRouter.get("/:id", async (req, res) => {
  const ctx = await getCtx(req);
  const drive = await findDriveFor(ctx, req.params.id);
  if (!drive) {
    res.status(404).json({ error: "Drive not found." });
    return;
  }
  const blocked = await planBlock(drive.collegeId, ctx.role, false);
  if (blocked) return sendBlocked(res, blocked);

  if (ctx.role !== "STUDENT") {
    res.json({ drive: toDriveDto(drive), hasResume: false, fit: null });
    return;
  }

  const resume = (await latestParsedResumes([ctx.userId])).get(ctx.userId);
  if (!resume) {
    res.json({ drive: toDriveDto(drive), hasResume: false, fit: null });
    return;
  }
  try {
    res.json({ drive: toDriveDto(drive), hasResume: true, fit: await getFit(drive, resume) });
  } catch (err) {
    handleServiceError(err, res);
  }
});

/** Student asks for tailored advice on a drive. The LLM call is made once
 * and cached with the fit, so re-opening the drive is free. */
drivesRouter.post("/:id/tips", async (req, res) => {
  const ctx = await getCtx(req);
  if (ctx.role !== "STUDENT") {
    res.status(403).json({ error: "Tips are for students." });
    return;
  }
  const drive = await findDriveFor(ctx, req.params.id);
  if (!drive) {
    res.status(404).json({ error: "Drive not found." });
    return;
  }
  const blocked = await planBlock(drive.collegeId, ctx.role, false);
  if (blocked) return sendBlocked(res, blocked);

  const resume = (await latestParsedResumes([ctx.userId])).get(ctx.userId);
  if (!resume) {
    res.status(400).json({ error: "Upload your resume first so we can compare it." });
    return;
  }

  try {
    const fit = await getFit(drive, resume);
    if (fit.tips) {
      res.json({ fit });
      return;
    }
    let tips;
    try {
      tips = await generateTips(drive, resume.parsed, fit.missing);
    } catch (err) {
      console.error("Tip generation failed:", err);
      res.status(502).json({ error: "Couldn't generate tips right now. Please try again." });
      return;
    }
    await prisma.driveFit.update({
      where: { driveId_resumeId: { driveId: drive.id, resumeId: resume.id } },
      data: { tipsJson: JSON.stringify(tips) },
    });
    res.json({ fit: { ...fit, tips } });
  } catch (err) {
    handleServiceError(err, res);
  }
});

// --- readiness (TPO: whole-college summary; faculty: their own students) -----

drivesRouter.get("/:id/readiness", async (req, res) => {
  const ctx = await getCtx(req);
  if (ctx.role === "STUDENT") {
    res.status(403).json({ error: "Not available." });
    return;
  }
  const drive = await findDriveFor(ctx, req.params.id);
  if (!drive) {
    res.status(404).json({ error: "Drive not found." });
    return;
  }
  const blocked = await planBlock(drive.collegeId, ctx.role, false);
  if (blocked) return sendBlocked(res, blocked);

  // Students in scope: everyone linked to a faculty member of this college
  // (TPO), or just the caller's own students (faculty).
  const facultyIds =
    ctx.role === "FACULTY"
      ? [ctx.userId]
      : (
          await prisma.user.findMany({
            where: { role: "FACULTY", collegeId: drive.collegeId },
            select: { id: true },
          })
        ).map((f) => f.id);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", facultyId: { in: facultyIds } },
    select: { id: true, name: true, email: true },
  });

  const resumes = await latestParsedResumes(students.map((s) => s.id));
  const skills = parseSkills(drive.skillsJson);
  const withResume = students.filter((s) => resumes.has(s.id));

  try {
    const matches = await matchSkills(
      skills,
      withResume.map((s) => ({
        id: s.id,
        text: resumeSearchText(resumes.get(s.id)!.parsed),
      }))
    );

    const rows = withResume.map((s) => {
      const m = matches.get(s.id) ?? { matched: [], missing: skills };
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        score: scoreOf(m.matched.length, skills.length),
        matched: m.matched,
        missing: m.missing,
      };
    });

    const gapCounts = new Map<string, number>();
    for (const r of rows) for (const skill of r.missing) gapCounts.set(skill, (gapCounts.get(skill) ?? 0) + 1);

    const summary = {
      totalStudents: students.length,
      withResume: rows.length,
      withoutResume: students.length - rows.length,
      averageScore: rows.length
        ? Math.round(rows.reduce((sum, r) => sum + r.score, 0) / rows.length)
        : null,
      buckets: {
        strong: rows.filter((r) => r.score >= 70).length,
        partial: rows.filter((r) => r.score >= 40 && r.score < 70).length,
        low: rows.filter((r) => r.score < 40).length,
      },
      topGaps: [...gapCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([skill, missingCount]) => ({
          skill,
          missingCount,
          percent: rows.length ? Math.round((missingCount / rows.length) * 100) : 0,
        })),
    };

    res.json({
      drive: toDriveDto(drive),
      summary,
      // Individual results are for faculty about their own students; the
      // TPO gets the aggregate only.
      students:
        ctx.role === "FACULTY" ? rows.sort((a, b) => b.score - a.score) : null,
    });
  } catch (err) {
    handleServiceError(err, res);
  }
});
