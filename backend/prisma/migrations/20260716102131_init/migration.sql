-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rawFilePath" TEXT NOT NULL,
    "parsedJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "detectedField" TEXT NOT NULL,
    "secondaryFields" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analyses_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ats_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "formattingScore" INTEGER NOT NULL,
    "keywordScore" INTEGER NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "structureScore" INTEGER NOT NULL,
    "breakdownJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ats_scores_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fix_suggestions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fix_suggestions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "questionsJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tests_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testId" TEXT NOT NULL,
    "answersJson" TEXT,
    "score" REAL,
    "topicBreakdownJson" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "test_attempts_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "course_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "testAttemptId" TEXT NOT NULL,
    "modulesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "course_plans_testAttemptId_fkey" FOREIGN KEY ("testAttemptId") REFERENCES "test_attempts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "coursePlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "estimatedHours" REAL NOT NULL,
    "resourcesJson" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "course_modules_coursePlanId_fkey" FOREIGN KEY ("coursePlanId") REFERENCES "course_plans" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
