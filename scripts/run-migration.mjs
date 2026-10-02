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

// ── verification ───────────────────────────────────────────────────────────
//
// Derived from the SQL that was actually run, NOT hardcoded.
//
// This used to check the 2026-09-27 liquidity migration's columns and indexes
// whatever file you passed, so it printed "PASS - schema is ready" after running
// a completely different migration it had verified nothing about. A green light
// that cannot go red is worse than no light at all.

const sql = readFileSync(file, "utf8");

const want = {
  tables: [...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi)].map((m) => m[1]),
  indexes: [...sql.matchAll(/CREATE(?:\s+UNIQUE)?\s+INDEX(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi)].map((m) => m[1]),
  columns: [...sql.matchAll(/ALTER TABLE\s+"([^"]+)"\s+[\s\S]{0,80}?ADD COLUMN(?:\s+IF NOT EXISTS)?\s+"([^"]+)"/gi)].map(
    (m) => ({ table: m[1], column: m[2] })
  ),
};

let missing = 0;

for (const t of [...new Set(want.tables)]) {
  // ::text matters - Prisma cannot deserialize Postgres' native `regclass`.
  const r = await prisma.$queryRawUnsafe(`SELECT to_regclass('"${t}"')::text AS t`);
  const present = Boolean(r[0].t);
  if (!present) missing += 1;
  console.log(`  table    ${t}${present ? "" : "   <-- MISSING"}`);
}

for (const { table, column } of want.columns) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT 1 AS ok FROM information_schema.columns WHERE table_name = '${table}' AND column_name = '${column}'`
  );
  const present = r.length > 0;
  if (!present) missing += 1;
  console.log(`  column   ${table}.${column}${present ? "" : "   <-- MISSING"}`);
}

const idxNames = [...new Set(want.indexes)];
if (idxNames.length) {
  const r = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE indexname IN (${idxNames.map((n) => `'${n}'`).join(",")})`
  );
  const found = new Set(r.map((x) => x.indexname));
  missing += idxNames.length - found.size;
  console.log(`  indexes  ${found.size} of ${idxNames.length}`);
  for (const n of idxNames) if (!found.has(n)) console.log(`           ${n}   <-- MISSING`);
}

// Timestamps that are genuinely impossible.
//
// This used to flag any row where updatedAt <> createdAt, which was correct for
// exactly ONE moment: immediately after the 2026-09-27 backfill, when nothing
// had been edited yet. On a live site an artisan editing their profile makes
// those differ legitimately, so it cried wolf on every run afterwards - and a
// check that always warns is a check nobody reads.
const impossible = await prisma.$queryRawUnsafe(`
  SELECT 'User' AS t, COUNT(*) FILTER (WHERE "updatedAt" < "createdAt")::int AS bad FROM "User"
  UNION ALL SELECT 'Service', COUNT(*) FILTER (WHERE "updatedAt" < "createdAt")::int FROM "Service"
  UNION ALL SELECT 'JobRequest', COUNT(*) FILTER (WHERE "updatedAt" < "createdAt")::int FROM "JobRequest"
`);
for (const d of impossible) {
  if (d.bad) {
    missing += 1;
    console.log(`  rows     ${d.t}: ${d.bad} with updatedAt BEFORE createdAt   <-- PROBLEM`);
  }
}

const checked = new Set(want.tables).size + want.columns.length + idxNames.length;
if (checked === 0) {
  console.log(`\nNOTHING TO VERIFY - ${file} declares no tables, columns or indexes.\n`);
} else {
  console.log(
    missing === 0
      ? `\nPASS - ${checked} object(s) declared by ${file} are present. Redeploy on Vercel.\n`
      : `\nINCOMPLETE - ${missing} check(s) failed. See above.\n`
  );
}

await prisma.$disconnect();
// Non-zero when anything the migration declared is not actually there, so
// this is safe to chain: `node scripts/run-migration.mjs x.sql && git push`.
process.exit(missing === 0 ? 0 : 1);
