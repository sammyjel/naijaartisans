// Applies a .sql migration statement-by-statement and verifies the result.
//
//   node scripts/run-migration.mjs docs/migrations/2026-09-27-liquidity.sql
//
// Why this exists rather than pasting into a web SQL editor:
//
// The migration is wrapped in BEGIN/COMMIT, so a single failing statement rolls
// back the whole thing. A browser editor reports that in a result tab which is
// easy to miss, and the outcome looks identical to success — the database is
// simply unchanged. That is exactly what happened on 2026-09-27: the Vercel
// build then failed 140 times with "The column User.updatedAt does not exist".
//
// This runner prints every statement as it executes, names the exact statement
// that fails, and finishes by checking that the columns really are there. It
// still runs inside one transaction, so a failure leaves the database untouched.
//
// Credentials: reads DATABASE_URL (or DIRECT_URL, preferred for DDL) from the
// environment or .env. It never prints them.

import { readFileSync, existsSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/run-migration.mjs <path-to.sql>");
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`No such file: ${file}`);
  process.exit(1);
}

// Minimal .env loader so this works without adding a dotenv dependency.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, "");
    if (val && !process.env[key]) process.env[key] = val;
  }
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error(
    [
      "",
      "No DIRECT_URL or DATABASE_URL found.",
      "",
      "Get the connection string from the NEON dashboard (not Vercel — Vercel",
      "marks it Sensitive, so it cannot be read back), then put it in .env:",
      "",
      '  DATABASE_URL="postgresql://...@ep-xxx-pooler.region.aws.neon.tech/neondb?sslmode=require"',
      '  DIRECT_URL="postgresql://...@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"',
      "",
      ".env is gitignored, so this will not be committed.",
      "",
    ].join("\n")
  );
  process.exit(1);
}

// Show which host we are about to touch, without ever printing credentials.
const host = url.replace(/^.*@/, "").replace(/[/?].*$/, "");
console.log(`\nTarget database host: ${host}`);
console.log(`Migration file:       ${file}\n`);

/** Strips comments and splits into executable statements. */
function parseStatements(sql) {
  const withoutBlockComments = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  const lines = withoutBlockComments
    .split(/\r?\n/)
    .filter((l) => !/^\s*--/.test(l)); // drop comment-only lines (incl. the rollback block)
  return lines
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    // BEGIN/COMMIT are handled by the transaction wrapper below.
    .filter((s) => !/^(BEGIN|COMMIT|ROLLBACK)$/i.test(s));
}

const statements = parseStatements(readFileSync(file, "utf8"));
console.log(`Parsed ${statements.length} statements.\n`);

const prisma = new PrismaClient({ datasources: { db: { url } }, log: ["error"] });

/** One-line summary of a statement, for readable progress output. */
function label(stmt) {
  const flat = stmt.replace(/\s+/g, " ").trim();
  return flat.length > 92 ? flat.slice(0, 92) + "…" : flat;
}

let failed = null;

try {
  await prisma.$transaction(
    async (tx) => {
      for (let i = 0; i < statements.length; i += 1) {
        const stmt = statements[i];
        const n = String(i + 1).padStart(3, " ");
        try {
          await tx.$executeRawUnsafe(stmt);
          console.log(`  ${n}/${statements.length}  ok    ${label(stmt)}`);
        } catch (e) {
          console.error(`  ${n}/${statements.length}  FAIL  ${label(stmt)}`);
          console.error(`\n        ${String(e.message).split("\n").join("\n        ")}\n`);
          failed = { index: i + 1, stmt, error: e };
          throw e; // roll the whole thing back
        }
      }
    },
    { timeout: 180000, maxWait: 30000 }
  );
} catch {
  console.error("\nMIGRATION ROLLED BACK. The database is unchanged.");
  if (failed) {
    console.error(`Statement ${failed.index} is the one to fix:\n`);
    console.error(failed.stmt + ";\n");
  }
  await prisma.$disconnect();
  process.exit(1);
}

console.log("\nCommitted. Verifying…\n");

const cols = await prisma.$queryRawUnsafe(`
  SELECT table_name, column_name FROM information_schema.columns
  WHERE (table_name = 'Service'    AND column_name = 'updatedAt')
     OR (table_name = 'JobRequest' AND column_name = 'updatedAt')
     OR (table_name = 'User'       AND column_name IN ('updatedAt','ratingAverage','reviewCount'))
     OR (table_name = 'Review'     AND column_name IN ('isDemo','jobRequestId'))
  ORDER BY table_name, column_name
`);
for (const c of cols) console.log(`  column   ${c.table_name}.${c.column_name}`);

// ::text matters — Prisma cannot deserialize Postgres' native `regclass` type.
const tbl = await prisma.$queryRawUnsafe(`SELECT to_regclass('"Notification"')::text AS t`);
console.log(`  table    ${tbl[0].t ?? "Notification MISSING"}`);

const idx = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS n FROM pg_indexes WHERE indexname IN (
    'Review_authorId_targetId_key','Review_targetId_createdAt_idx','Review_jobRequestId_idx',
    'Review_authorId_idx','Notification_dedupeKey_key','Notification_userId_readAt_idx',
    'User_role_city_idx','Service_categoryId_city_idx','Service_artisanId_idx',
    'JobRequest_categoryId_city_idx','JobRequest_status_createdAt_idx')
`);
console.log(`  indexes  ${idx[0].n} of 11`);

// The honesty check: updatedAt must have been backfilled from createdAt, not
// stamped with the migration time. Otherwise the sitemap tells Google that every
// artisan and service page changed today.
const drift = await prisma.$queryRawUnsafe(`
  SELECT 'User' AS t, COUNT(*) FILTER (WHERE "updatedAt" <> "createdAt")::int AS fake FROM "User"
  UNION ALL SELECT 'Service', COUNT(*) FILTER (WHERE "updatedAt" <> "createdAt")::int FROM "Service"
  UNION ALL SELECT 'JobRequest', COUNT(*) FILTER (WHERE "updatedAt" <> "createdAt")::int FROM "JobRequest"
`);
for (const d of drift) {
  console.log(`  backfill ${d.t}: ${d.fake} row(s) with a fabricated timestamp${d.fake ? "  <-- PROBLEM" : ""}`);
}

const expected = 7;
const ok = cols.length === expected && tbl[0].t && idx[0].n === 11;
console.log(
  ok
    ? "\nPASS - schema is ready. Redeploy on Vercel.\n"
    : `\nINCOMPLETE - expected ${expected} columns, got ${cols.length}. See above.\n`
);

await prisma.$disconnect();
process.exit(ok ? 0 : 1);
