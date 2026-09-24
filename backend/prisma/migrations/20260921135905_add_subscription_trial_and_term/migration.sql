-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "paidAt" DATETIME;
ALTER TABLE "subscriptions" ADD COLUMN "termEndsAt" DATETIME;
ALTER TABLE "subscriptions" ADD COLUMN "trialEndsAt" DATETIME;

-- Subscriptions created before free trials existed were activated outright,
-- so treat them as paid for one year (365 days, in ms) from activation
-- rather than putting existing customers on a trial.
UPDATE "subscriptions"
SET "paidAt" = "activatedAt",
    "termEndsAt" = "activatedAt" + 31536000000
WHERE "status" = 'active' AND "activatedAt" IS NOT NULL;
