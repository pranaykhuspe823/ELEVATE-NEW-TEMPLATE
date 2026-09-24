-- CreateTable
CREATE TABLE "faculty_weak_topics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "faculty_weak_topics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "faculty_weak_topics_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_plagiarism_checks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "matchedResumeId" TEXT NOT NULL,
    "similarityScore" REAL NOT NULL,
    "explanation" TEXT,
    "overlapJson" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'open',
    "facultyNote" TEXT,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "plagiarism_checks_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "plagiarism_checks_matchedResumeId_fkey" FOREIGN KEY ("matchedResumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_plagiarism_checks" ("createdAt", "explanation", "id", "matchedResumeId", "overlapJson", "resumeId", "similarityScore", "source") SELECT "createdAt", "explanation", "id", "matchedResumeId", "overlapJson", "resumeId", "similarityScore", "source" FROM "plagiarism_checks";
DROP TABLE "plagiarism_checks";
ALTER TABLE "new_plagiarism_checks" RENAME TO "plagiarism_checks";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
