-- AlterTable
ALTER TABLE "plagiarism_checks" ADD COLUMN "overlapJson" TEXT;

-- AlterTable
ALTER TABLE "resumes" ADD COLUMN "plagiarismScore" REAL;
