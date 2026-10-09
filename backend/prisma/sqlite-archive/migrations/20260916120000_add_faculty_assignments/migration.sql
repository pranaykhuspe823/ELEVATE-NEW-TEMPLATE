-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'STUDENT';
ALTER TABLE "users" ADD COLUMN "facultyCode" TEXT;
ALTER TABLE "users" ADD COLUMN "facultyId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_facultyCode_key" ON "users"("facultyCode");

-- CreateTable
CREATE TABLE "course_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "sourceModuleId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedHours" REAL NOT NULL DEFAULT 2,
    "resourcesJson" TEXT NOT NULL DEFAULT '[]',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "course_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AddForeignKey (self-relation for faculty -> students)
-- SQLite has no ALTER TABLE ... ADD CONSTRAINT; the FK below is enforced by
-- Prisma at the client level via the "facultyId" column added above, same
-- pattern Prisma uses for existing nullable self-relations on this provider.
