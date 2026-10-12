-- CreateTable
CREATE TABLE "course_quizzes" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "stage" INTEGER NOT NULL,
    "questionsJson" TEXT NOT NULL,
    "answersJson" TEXT,
    "score" INTEGER,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "course_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "course_quizzes_assignmentId_stage_idx" ON "course_quizzes"("assignmentId", "stage");

-- AddForeignKey
ALTER TABLE "course_quizzes" ADD CONSTRAINT "course_quizzes_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "course_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
