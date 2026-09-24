-- AlterTable
ALTER TABLE "users" ADD COLUMN "googleId" TEXT;
ALTER TABLE "users" ADD COLUMN "name" TEXT;
ALTER TABLE "users" ADD COLUMN "avatarUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");
