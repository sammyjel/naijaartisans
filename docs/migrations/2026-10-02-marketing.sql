-- Marketing attribution: campaigns, and the conversions they produced.
--
-- Run with:  node scripts/run-migration.mjs docs/migrations/2026-10-02-marketing.sql
-- NOT in the Neon web editor — one failing statement in this BEGIN/COMMIT would
-- discard all of it while the browser hides the error in a result tab.
--
-- Additive and idempotent. Safe to run before deploying the code; nothing
-- existing reads these tables.
--
-- NOTE ON COST: these tables are written on CONVERSION only, never on a visit.
-- A row per pageview would re-create the compute-quota outage of 2026-10-01 on
-- a site with 174 crawled URLs. See the comment block in prisma/schema.prisma.

BEGIN;

CREATE TABLE IF NOT EXISTS "Campaign" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "objective"   TEXT NOT NULL DEFAULT 'TRAFFIC',
  "destination" TEXT NOT NULL DEFAULT '/',
  "audience"    TEXT NOT NULL DEFAULT 'NIGERIA',
  "status"      TEXT NOT NULL DEFAULT 'DRAFT',
  "startsAt"    TIMESTAMP(3),
  "endsAt"      TIMESTAMP(3),
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The slug IS the utm_campaign value, so it has to be unique or two campaigns
-- would share one row in every report.
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_slug_key" ON "Campaign" ("slug");
CREATE INDEX IF NOT EXISTS "Campaign_status_createdAt_idx" ON "Campaign" ("status", "createdAt");

CREATE TABLE IF NOT EXISTS "Attribution" (
  "id"             TEXT PRIMARY KEY,
  "conversion"     TEXT NOT NULL,
  "campaignId"     TEXT,
  "source"         TEXT NOT NULL DEFAULT 'direct',
  "medium"         TEXT NOT NULL DEFAULT 'none',
  "campaignTag"    TEXT NOT NULL DEFAULT '',
  "content"        TEXT NOT NULL DEFAULT '',
  "term"           TEXT NOT NULL DEFAULT '',
  "landingPath"    TEXT,
  "conversionPath" TEXT,
  "userId"         TEXT,
  "subjectType"    TEXT,
  "subjectId"      TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Attribution_conversion_createdAt_idx" ON "Attribution" ("conversion", "createdAt");
CREATE INDEX IF NOT EXISTS "Attribution_campaignId_conversion_idx" ON "Attribution" ("campaignId", "conversion");
CREATE INDEX IF NOT EXISTS "Attribution_source_medium_idx" ON "Attribution" ("source", "medium");
CREATE INDEX IF NOT EXISTS "Attribution_createdAt_idx" ON "Attribution" ("createdAt");

-- SET NULL on both: deleting a campaign or a user must not erase the evidence
-- that marketing produced a customer. That record is the whole point.
ALTER TABLE "Attribution" DROP CONSTRAINT IF EXISTS "Attribution_campaignId_fkey";
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_campaignId_fkey"
  FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attribution" DROP CONSTRAINT IF EXISTS "Attribution_userId_fkey";
ALTER TABLE "Attribution" ADD CONSTRAINT "Attribution_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;

-- ── verification ───────────────────────────────────────────────────────────
--   SELECT COUNT(*) FROM "Campaign";     -- expect 0
--   SELECT COUNT(*) FROM "Attribution";  -- expect 0
--
-- Nothing is backfilled. There is no record of where past visitors came from,
-- and inventing one would poison the only report this system exists to produce.

-- ── rollback ───────────────────────────────────────────────────────────────
-- BEGIN;
--   DROP TABLE IF EXISTS "Attribution";
--   DROP TABLE IF EXISTS "Campaign";
-- COMMIT;
