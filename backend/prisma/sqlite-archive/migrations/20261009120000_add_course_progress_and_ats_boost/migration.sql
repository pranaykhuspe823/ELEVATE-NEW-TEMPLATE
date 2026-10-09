-- AlterTable
ALTER TABLE "course_plans" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ready';

-- AlterTable
ALTER TABLE "course_modules" ADD COLUMN "keywordsJson" TEXT NOT NULL DEFAULT '[]';

-- RedefineTables: course_assignments.assignedById becomes nullable (students
-- can now start a recommended course themselves), plus progress + keywords.
-- Existing completed assignments are backfilled to 100%.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_course_assignments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "assignedById" TEXT,
    "sourceModuleId" TEXT,
    "title" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedHours" REAL NOT NULL DEFAULT 2,
    "resourcesJson" TEXT NOT NULL DEFAULT '[]',
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'assigned',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "keywordsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "course_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "course_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_course_assignments" ("id", "studentId", "assignedById", "sourceModuleId", "title", "topic", "priority", "estimatedHours", "resourcesJson", "reason", "status", "progressPercent", "createdAt", "completedAt")
SELECT "id", "studentId", "assignedById", "sourceModuleId", "title", "topic", "priority", "estimatedHours", "resourcesJson", "reason", "status",
       CASE WHEN "status" = 'completed' THEN 100 ELSE 0 END,
       "createdAt", "completedAt"
FROM "course_assignments";
DROP TABLE "course_assignments";
ALTER TABLE "new_course_assignments" RENAME TO "course_assignments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
