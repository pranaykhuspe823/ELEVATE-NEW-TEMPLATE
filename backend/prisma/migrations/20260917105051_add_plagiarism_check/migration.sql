-- CreateTable
CREATE TABLE "plagiarism_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "matchedResumeId" TEXT NOT NULL,
    "similarityScore" REAL NOT NULL,
    "explanation" TEXT,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plagiarism_checks_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plagiarism_checks_matchedResumeId_fkey" FOREIGN KEY ("matchedResumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
