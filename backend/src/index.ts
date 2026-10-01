import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
import { prisma } from "./lib/prisma";
import { processResume } from "./services/resumeProcessing";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "5mb" })); // webcam proctoring frames are sent as base64 JSON
app.use(cookieParser());

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
});
