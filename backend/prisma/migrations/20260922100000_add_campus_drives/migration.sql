-- CreateTable
CREATE TABLE "campus_drives" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "collegeId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "driveDate" DATETIME,
    "location" TEXT,
    "ctc" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campus_drives_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "colleges" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "drive_fits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driveId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "matchedJson" TEXT NOT NULL DEFAULT '[]',
    "missingJson" TEXT NOT NULL DEFAULT '[]',
    "tipsJson" TEXT,
    "driveUpdatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "drive_fits_driveId_fkey" FOREIGN KEY ("driveId") REFERENCES "campus_drives" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "drive_fits_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "resumes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "drive_fits_driveId_resumeId_key" ON "drive_fits"("driveId", "resumeId");
