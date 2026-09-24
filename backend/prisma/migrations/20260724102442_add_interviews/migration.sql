-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "targetRole" TEXT,
    "transcriptJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "overallScore" REAL,
    "communicationScore" REAL,
    "technicalDepthScore" REAL,
    "resumeConsistencyScore" REAL,
    "confidenceScore" REAL,
    "feedbackJson" TEXT,
    "recommendation" TEXT,
    "recommendationReason" TEXT,
    "detailedFeedback" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "interviews_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
