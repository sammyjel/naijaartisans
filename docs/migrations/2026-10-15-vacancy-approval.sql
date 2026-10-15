-- Admin approval for jobs posted by artisan accounts.
--
-- Run with:  node scripts/run-migration.mjs docs/migrations/2026-10-15-vacancy-approval.sql
-- NOT in the Neon web editor — see the note in 2026-10-02-marketing.sql.
--
-- Additive and idempotent. Safe to run before deploying the code; nothing
-- existing reads this column, and NULL (the default) preserves today's rule:
-- an artisan-posted job is not declared to Google as a vacancy.
--
-- Why: the 2026-10-03 rule treats every artisan-posted job as a self-advert.
-- "Pile breaker" (2026-10-15) is an artisan genuinely hiring labourers, and was
-- noindexed for it. This is the explicit approval that rule anticipated.

BEGIN;

ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "vacancyApprovedAt" TIMESTAMP(3);

COMMIT;
