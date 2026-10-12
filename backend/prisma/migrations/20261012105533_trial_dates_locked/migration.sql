-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "trialEndedEmailAt" TIMESTAMP(3),
ADD COLUMN     "trialReminderDaysLeft" INTEGER;

-- The free trial's start (activatedAt) and end (trialEndsAt) are written once,
-- when the college registers. Nothing -- app code, a bug, or a manual UPDATE --
-- may move them afterwards, so the trial can't be paused, extended or restarted.
CREATE OR REPLACE FUNCTION lock_trial_dates() RETURNS trigger AS $$
BEGIN
  IF OLD."trialEndsAt" IS NOT NULL AND NEW."trialEndsAt" IS DISTINCT FROM OLD."trialEndsAt" THEN
    RAISE EXCEPTION 'trialEndsAt is locked once set';
  END IF;
  IF OLD."activatedAt" IS NOT NULL AND NEW."activatedAt" IS DISTINCT FROM OLD."activatedAt" THEN
    RAISE EXCEPTION 'activatedAt is locked once set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_lock_trial_dates
  BEFORE UPDATE ON "subscriptions"
  FOR EACH ROW EXECUTE FUNCTION lock_trial_dates();
