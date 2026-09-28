-- Deals: the record of work between a customer and an artisan, and the source
-- of the public "X jobs completed" badge.
--
-- Run with:  node scripts/run-migration.mjs docs/migrations/2026-09-29-deals.sql
-- NOT in the Neon web editor — this is one BEGIN/COMMIT, so a single failing
-- statement discards all of it while the browser buries the error in a tab.
--
-- Idempotent: every statement is IF NOT EXISTS or guarded, so a partial run can
-- be repeated safely. A rollback block is at the bottom, commented out.
--
-- Safe to run before deploying the code: the new table and columns are additive,
-- and nothing existing reads them. Deploy the code AFTER this succeeds.

BEGIN;

-- ── the artisan's confirmed-completion counter ─────────────────────────────
-- Denormalised like reviewCount, for the same reason: /browse renders up to 60
-- cards and must not run an aggregate per card. Starts at 0 for everyone, which
-- is truthful — no deal has ever been completed, because deals did not exist.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "completedDealCount" INTEGER NOT NULL DEFAULT 0;

-- ── the deal itself ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Deal" (
  "id"           TEXT PRIMARY KEY,
  "jobRequestId" TEXT,
  "quoteId"      TEXT,
  "customerId"   TEXT NOT NULL,
  "artisanId"    TEXT NOT NULL,
  "status"       TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  "agreedPrice"  INTEGER,
  "title"        TEXT NOT NULL,
  "startedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "workDoneAt"   TIMESTAMP(3),
  "completedAt"  TIMESTAMP(3),
  "cancelledAt"  TIMESTAMP(3),
  "cancelledBy"  TEXT,
  "lastNote"     TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One deal per artisan per job. This constraint — not application logic — is
-- what stops a double-accepted quote creating two completable deals and
-- double-counting the badge.
CREATE UNIQUE INDEX IF NOT EXISTS "Deal_jobRequestId_artisanId_key"
  ON "Deal" ("jobRequestId", "artisanId");

-- One deal per quote.
CREATE UNIQUE INDEX IF NOT EXISTS "Deal_quoteId_key" ON "Deal" ("quoteId");

CREATE INDEX IF NOT EXISTS "Deal_artisanId_status_idx"  ON "Deal" ("artisanId", "status");
CREATE INDEX IF NOT EXISTS "Deal_customerId_status_idx" ON "Deal" ("customerId", "status");
CREATE INDEX IF NOT EXISTS "Deal_status_completedAt_idx" ON "Deal" ("status", "completedAt");

-- Foreign keys. Dropped first so a re-run does not fail on an existing one.
-- Customer/artisan cascade: deleting an account removes its deals. Job and
-- quote SET NULL: deleting a job must not erase an artisan's completion record,
-- which is the same reasoning already applied to Review.jobRequestId.
ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_customerId_fkey";
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_artisanId_fkey";
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_artisanId_fkey"
  FOREIGN KEY ("artisanId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_jobRequestId_fkey";
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_jobRequestId_fkey"
  FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Deal" DROP CONSTRAINT IF EXISTS "Deal_quoteId_fkey";
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_quoteId_fkey"
  FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── link a review back to the deal that earned it ──────────────────────────
-- A review carrying a dealId is rendered as "Verified job": the customer
-- confirmed real work, rather than merely having been quoted at.
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "dealId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Review_dealId_key" ON "Review" ("dealId");

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_dealId_fkey";
ALTER TABLE "Review" ADD CONSTRAINT "Review_dealId_fkey"
  FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

-- ── verification ───────────────────────────────────────────────────────────
-- Run these after the migration; run-migration.mjs checks them automatically.
--
--   SELECT COUNT(*) FROM "Deal";                      -- expect 0
--   SELECT COUNT(*) FROM "User" WHERE "completedDealCount" <> 0;  -- expect 0
--   SELECT COUNT(*) FROM "Review" WHERE "dealId" IS NOT NULL;     -- expect 0
--
-- Nothing is backfilled on purpose. There is no honest way to say which of the
-- 4 existing quotes turned into completed work, and inventing completions would
-- poison the one number this whole feature exists to make trustworthy.

-- ── rollback ───────────────────────────────────────────────────────────────
-- BEGIN;
--   ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_dealId_fkey";
--   DROP INDEX IF EXISTS "Review_dealId_key";
--   ALTER TABLE "Review" DROP COLUMN IF EXISTS "dealId";
--   DROP TABLE IF EXISTS "Deal";
--   ALTER TABLE "User" DROP COLUMN IF EXISTS "completedDealCount";
-- COMMIT;
