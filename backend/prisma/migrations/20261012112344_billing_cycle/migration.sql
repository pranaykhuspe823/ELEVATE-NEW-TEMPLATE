-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "billingCycle" TEXT NOT NULL DEFAULT 'yearly';

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "billingCycle" TEXT NOT NULL DEFAULT 'yearly';
