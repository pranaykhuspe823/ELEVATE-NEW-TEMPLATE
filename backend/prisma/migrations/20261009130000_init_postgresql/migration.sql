-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "passwordHash" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "emailVerificationToken" TEXT,
    "emailVerificationExpiresAt" TIMESTAMP(3),
    "facultyCode" TEXT,
    "facultyId" TEXT,
    "collegeId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colleges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interestedPlanKey" TEXT,
    "signupNotes" TEXT,
    "adminPhone" TEXT,
    "adminId" TEXT NOT NULL,

    CONSTRAINT "colleges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campus_drives" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "driveDate" TIMESTAMP(3),
    "location" TEXT,
    "ctc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campus_drives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_fits" (
    "id" TEXT NOT NULL,
    "driveId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "matchedJson" TEXT NOT NULL DEFAULT '[]',
    "missingJson" TEXT NOT NULL DEFAULT '[]',
    "tipsJson" TEXT,
    "driveUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drive_fits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "planKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "facultySeats" INTEGER NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "termEndsAt" TIMESTAMP(3),

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resumes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rawFilePath" TEXT NOT NULL,
    "parsedJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    "plagiarismScore" DOUBLE PRECISION,

    CONSTRAINT "resumes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "detectedField" TEXT NOT NULL,
    "secondaryFields" TEXT NOT NULL,
    "seniority" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ats_scores" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "formattingScore" INTEGER NOT NULL,
    "keywordScore" INTEGER NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "structureScore" INTEGER NOT NULL,
    "breakdownJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ats_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plagiarism_checks" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "matchedResumeId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT,
    "overlapJson" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'open',
    "facultyNote" TEXT,
    "source" TEXT NOT NULL DEFAULT 'internal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plagiarism_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faculty_weak_topics" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "faculty_weak_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fix_suggestions" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "suggestedText" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fix_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tests" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "questionsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "test_attempts" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "answersJson" TEXT,
    "score" DOUBLE PRECISION,
    "topicBreakdownJson" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "test_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_plans" (
    "id" TEXT NOT NULL,
    "testAttemptId" TEXT NOT NULL,
    "modulesJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interviews" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "targetRole" TEXT,
    "transcriptJson" TEXT NOT NULL,
    "keywordsJson" TEXT NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "overallScore" DOUBLE PRECISION,
    "communicationScore" DOUBLE PRECISION,
    "technicalDepthScore" DOUBLE PRECISION,
    "resumeConsistencyScore" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "feedbackJson" TEXT,
    "recommendation" TEXT,
    "recommendationReason" TEXT,
    "detailedFeedback" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" TEXT NOT NULL,
    "coursePlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "resourcesJson" TEXT NOT NULL,
    "keywordsJson" TEXT NOT NULL DEFAULT '[]',
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demo_requests" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "planKey" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "demo_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedById" TEXT,
    "sourceModuleId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "resourcesJson" TEXT NOT NULL DEFAULT '[]',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "keywordsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "course_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "users_facultyCode_key" ON "users"("facultyCode");

-- CreateIndex
CREATE UNIQUE INDEX "colleges_adminId_key" ON "colleges"("adminId");

-- CreateIndex
CREATE UNIQUE INDEX "drive_fits_driveId_resumeId_key" ON "drive_fits"("driveId", "resumeId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_collegeId_key" ON "subscriptions"("collegeId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colleges" ADD CONSTRAINT "colleges_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campus_drives" ADD CONSTRAINT "campus_drives_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_fits" ADD CONSTRAINT "drive_fits_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "campus_drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_fits" ADD CONSTRAINT "drive_fits_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resumes" ADD CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ats_scores" ADD CONSTRAINT "ats_scores_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_checks" ADD CONSTRAINT "plagiarism_checks_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_checks" ADD CONSTRAINT "plagiarism_checks_matchedResumeId_fkey" FOREIGN KEY ("matchedResumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_weak_topics" ADD CONSTRAINT "faculty_weak_topics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculty_weak_topics" ADD CONSTRAINT "faculty_weak_topics_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fix_suggestions" ADD CONSTRAINT "fix_suggestions_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tests" ADD CONSTRAINT "tests_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_testId_fkey" FOREIGN KEY ("testId") REFERENCES "tests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_plans" ADD CONSTRAINT "course_plans_testAttemptId_fkey" FOREIGN KEY ("testAttemptId") REFERENCES "test_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_coursePlanId_fkey" FOREIGN KEY ("coursePlanId") REFERENCES "course_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_assignments" ADD CONSTRAINT "course_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

