-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_resumes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rawFilePath" TEXT NOT NULL,
    "parsedJson" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "processingError" TEXT,
    CONSTRAINT "resumes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_resumes" ("filename", "id", "parsedJson", "rawFilePath", "uploadedAt", "userId", "version") SELECT "filename", "id", "parsedJson", "rawFilePath", "uploadedAt", "userId", "version" FROM "resumes";
DROP TABLE "resumes";
ALTER TABLE "new_resumes" RENAME TO "resumes";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
