-- ===========================================================================
-- NaijaArtisans — liquidity / social-proof / SEO migration      2026-09-27
--
-- Run this in the Neon SQL Editor BEFORE deploying the code that uses it.
-- Every statement is idempotent: re-running it is safe and does nothing twice.
--
-- IMPORTANT ON BACKFILLS: the new updatedAt columns are backfilled from
-- createdAt, NOT from now(). Stamping every existing row with the migration
-- time would put a fake <lastmod> on 138 sitemap URLs the next morning.
-- ===========================================================================

BEGIN;

-- ── 1. User: honest updatedAt + denormalised review aggregates ─────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ratingAverage" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reviewCount"   INTEGER NOT NULL DEFAULT 0;

-- Backfill from createdAt so existing profiles do not all claim to have been
-- edited at migration time, then make it NOT NULL to match the Prisma model.
UPDATE "User" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ── 2. Service: updatedAt for the city money pages ─────────────────────────
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "Service" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "Service" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ── 3. JobRequest: updatedAt ───────────────────────────────────────────────
ALTER TABLE "JobRequest" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);
UPDATE "JobRequest" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;
ALTER TABLE "JobRequest" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE "JobRequest" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- ── 4. Review: job link, demo flag, dedupe ─────────────────────────────────
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "jobRequestId" TEXT;
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "isDemo" BOOLEAN NOT NULL DEFAULT false;

-- Drop-then-add rather than a DO/EXCEPTION block: browser SQL editors split on
-- semicolons and some of them mis-split dollar-quoted bodies. This is just as
-- idempotent and has no $ in it.
ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_jobRequestId_fkey";
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_jobRequestId_fkey"
  FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- De-duplicate any pre-existing (author, target) pairs BEFORE adding the unique
-- index, keeping the most recent review. Without this the index creation fails
-- on a database that already has duplicates.
DELETE FROM "Review" r
USING "Review" keep
WHERE r."authorId" = keep."authorId"
  AND r."targetId" = keep."targetId"
  AND (r."createdAt" < keep."createdAt"
       OR (r."createdAt" = keep."createdAt" AND r."id" < keep."id"));

CREATE UNIQUE INDEX IF NOT EXISTS "Review_authorId_targetId_key"
  ON "Review" ("authorId", "targetId");
CREATE INDEX IF NOT EXISTS "Review_targetId_createdAt_idx"
  ON "Review" ("targetId", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_jobRequestId_idx" ON "Review" ("jobRequestId");
CREATE INDEX IF NOT EXISTS "Review_authorId_idx"     ON "Review" ("authorId");

-- ── 5. Notification ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"            TEXT         NOT NULL,
  "userId"        TEXT         NOT NULL,
  "type"          TEXT         NOT NULL,
  "title"         TEXT         NOT NULL,
  "body"          TEXT         NOT NULL,
  "url"           TEXT         NOT NULL,
  "jobRequestId"  TEXT,
  "dedupeKey"     TEXT         NOT NULL,
  "readAt"        TIMESTAMP(3),
  "emailStatus"   TEXT         NOT NULL DEFAULT 'PENDING',
  "emailAttempts" INTEGER      NOT NULL DEFAULT 0,
  "emailError"    TEXT,
  "emailSentAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_userId_fkey";
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification" DROP CONSTRAINT IF EXISTS "Notification_jobRequestId_fkey";
ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_jobRequestId_fkey"
  FOREIGN KEY ("jobRequestId") REFERENCES "JobRequest"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- The idempotency guarantee for job notifications.
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_dedupeKey_key"
  ON "Notification" ("dedupeKey");
CREATE INDEX IF NOT EXISTS "Notification_userId_readAt_idx"
  ON "Notification" ("userId", "readAt");
CREATE INDEX IF NOT EXISTS "Notification_jobRequestId_idx"
  ON "Notification" ("jobRequestId");
CREATE INDEX IF NOT EXISTS "Notification_emailStatus_createdAt_idx"
  ON "Notification" ("emailStatus", "createdAt");

-- ── 6. Indexes justified by the queries this release adds ──────────────────
-- Artisan matching: WHERE role = 'ARTISAN' AND city = $1
CREATE INDEX IF NOT EXISTS "User_role_city_idx" ON "User" ("role", "city");
-- /services/<category>/<city>: WHERE categoryId = $1 AND city = $2
CREATE INDEX IF NOT EXISTS "Service_categoryId_city_idx" ON "Service" ("categoryId", "city");
CREATE INDEX IF NOT EXISTS "Service_artisanId_idx"       ON "Service" ("artisanId");
-- Matching reads OPEN jobs by category+city; the board reads newest-first.
CREATE INDEX IF NOT EXISTS "JobRequest_categoryId_city_idx"  ON "JobRequest" ("categoryId", "city");
CREATE INDEX IF NOT EXISTS "JobRequest_status_createdAt_idx" ON "JobRequest" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "JobRequest_customerId_idx"       ON "JobRequest" ("customerId");

-- ── 7. Seed the aggregates from existing GENUINE reviews ───────────────────
-- isDemo = false filter matters: a staging database seeded with demo reviews
-- must not end up with a public rating derived from them.
UPDATE "User" u SET
  "ratingAverage" = agg.avg_rating,
  "reviewCount"   = agg.cnt
FROM (
  SELECT "targetId", AVG(rating)::double precision AS avg_rating, COUNT(*)::int AS cnt
  FROM "Review" WHERE "isDemo" = false GROUP BY "targetId"
) agg
WHERE u.id = agg."targetId";

COMMIT;

-- ===========================================================================
-- ROLLBACK (only if this release is reverted; drops the new columns/table)
-- ===========================================================================
-- BEGIN;
-- DROP TABLE IF EXISTS "Notification";
-- ALTER TABLE "Review" DROP COLUMN IF EXISTS "jobRequestId";
-- ALTER TABLE "Review" DROP COLUMN IF EXISTS "isDemo";
-- DROP INDEX IF EXISTS "Review_authorId_targetId_key";
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "ratingAverage";
-- ALTER TABLE "User" DROP COLUMN IF EXISTS "reviewCount";
-- ALTER TABLE "User"       DROP COLUMN IF EXISTS "updatedAt";
-- ALTER TABLE "Service"    DROP COLUMN IF EXISTS "updatedAt";
-- ALTER TABLE "JobRequest" DROP COLUMN IF EXISTS "updatedAt";
-- COMMIT;
