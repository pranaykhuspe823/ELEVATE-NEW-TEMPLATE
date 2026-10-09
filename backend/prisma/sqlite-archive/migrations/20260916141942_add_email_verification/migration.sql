-- AlterTable
ALTER TABLE "users" ADD COLUMN "emailVerificationExpiresAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "emailVerificationToken" TEXT;
ALTER TABLE "users" ADD COLUMN "emailVerifiedAt" DATETIME;

-- CreateIndex
CREATE UNIQUE INDEX "users_emailVerificationToken_key" ON "users"("emailVerificationToken");
