import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { authRouter } from "./routes/auth";
import { resumesRouter } from "./routes/resumes";
import { testsRouter } from "./routes/tests";
import { proctorRouter } from "./routes/proctor";
import { fixSuggestionActionsRouter } from "./routes/fixSuggestionsRoutes";
import { interviewsRouter } from "./routes/interviews";
import { facultyRouter } from "./routes/faculty";
import { assignmentsRouter } from "./routes/assignments";
import { collegesRouter } from "./routes/colleges";
import { profileRouter } from "./routes/profile";
import { drivesRouter } from "./routes/drives";
import { demoRequestsRouter } from "./routes/demoRequests";
import { webhooksRouter } from "./routes/webhooks";
import { prisma } from "./lib/prisma";
import { processResume } from "./services/resumeProcessing";
import { startTrialReminderJob } from "./services/trialReminders";
import {
  apiLimiter,
  expensiveLimiter,
  loginLimiter,
  publicFormLimiter,
} from "./lib/rateLimits";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

// Behind a reverse proxy (nginx, Caddy, a load balancer) set TRUST_PROXY=1 so
// rate limits see the real client IP instead of the proxy's.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);
app.disable("x-powered-by");

// JSON API only, so the strictest CSP is fine. Avatars override
// Cross-Origin-Resource-Policy themselves so <img> on the frontend can load them.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
// Before express.json(): webhook signatures are checked against the raw body.
app.use("/api/webhooks", webhooksRouter);
app.use(express.json({ limit: "5mb" })); // webcam proctoring frames are sent as base64 JSON
app.use(cookieParser());

app.use("/api", apiLimiter);
app.use("/api/auth/faculty/login", loginLimiter);
app.use("/api/auth/college/login", loginLimiter);
app.use("/api/profile/password", loginLimiter);
app.use("/api/auth/faculty/register", publicFormLimiter);
app.use("/api/colleges/register", publicFormLimiter);
app.use("/api/colleges/activate", publicFormLimiter);
app.use("/api/colleges/resend-activation", publicFormLimiter);
app.use("/api/demo-requests", publicFormLimiter);
app.use("/api/auth/join-faculty", expensiveLimiter);
for (const prefix of [
  "/api/resumes",
  "/api/tests",
  "/api/fix-suggestions",
  "/api/interviews",
  "/api/faculty",
  "/api/assignments",
  "/api/drives",
]) {
  app.use(prefix, expensiveLimiter);
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "elevate-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/resumes", resumesRouter);
app.use("/api/tests", testsRouter);
app.use("/api/tests", proctorRouter);
app.use("/api/fix-suggestions", fixSuggestionActionsRouter);
app.use("/api/interviews", interviewsRouter);
app.use("/api/faculty", facultyRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/colleges", collegesRouter);
app.use("/api/profile", profileRouter);
app.use("/api/drives", drivesRouter);
app.use("/api/demo-requests", demoRequestsRouter);

// Last-resort handler: log the details, never send stack traces to the client.
app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (res.headersSent) return;
    if (err?.type === "entity.too.large") {
      res.status(413).json({ error: "Request is too large." });
      return;
    }
    if (err?.type === "entity.parse.failed") {
      res.status(400).json({ error: "Malformed JSON." });
      return;
    }
    res.status(500).json({ error: "Something went wrong on our side. Try again in a moment." });
  }
);

// A resume can be left in "processing" forever if the process restarts
// mid-pipeline (the in-process job dies with it, nothing else updates the
// row). Re-kick anything orphaned like that on every startup.
async function recoverStuckResumes() {
  const stuck = await prisma.resume.findMany({
    where: { status: "processing" },
  });
  for (const resume of stuck) {
    console.log(
      `Recovering orphaned resume ${resume.id} (${resume.filename})`
    );
    processResume(resume.id, resume.rawFilePath, resume.filename).catch(
      () => {}
    );
  }
}

app.listen(PORT, () => {
  console.log(`elevate-backend listening on http://localhost:${PORT}`);
  recoverStuckResumes();
  startTrialReminderJob();
});
