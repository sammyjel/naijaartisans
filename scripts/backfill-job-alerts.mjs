// One-off: alert every artisan to the OPEN jobs that were posted before the
// notification system existed.
//
//   node scripts/backfill-job-alerts.mjs            dry run - reports only
//   node scripts/backfill-job-alerts.mjs --send     attempts a real send
//
// The logic lives in src/lib/job-digest.js, shared with
// POST /api/admin/notifications/backfill.
//
// IMPORTANT: --send does not work from a local machine. RESEND_API_KEY is a
// Sensitive Vercel environment variable, so `vercel env pull` returns it empty
// and no local process can read it. Running --send here would create the in-app
// notifications and then report that no email could be sent. Use the route for
// the real send; this script is for dry runs and inspection against the live DB.

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { runJobBackfill } from "../src/lib/job-digest.js";

const SEND = process.argv.includes("--send");

// Minimal .env loader (no dotenv dependency).
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const v = m[2].replace(/^["']|["']$/g, "");
    if (v && !process.env[m[1]]) process.env[m[1]] = v;
  }
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("No DATABASE_URL / DIRECT_URL. See scripts/run-migration.mjs for where to get it.");
  process.exit(1);
}

if (SEND && !process.env.RESEND_API_KEY) {
  console.error(
    "Refusing to --send: RESEND_API_KEY is not readable locally (it is Sensitive in Vercel).\n" +
      "This would create notifications but send no email. Use the admin route instead:\n" +
      "  POST /api/admin/notifications/backfill  with  { \"send\": true }"
  );
  process.exit(1);
}

const prisma = new PrismaClient({ datasources: { db: { url } }, log: [] });

try {
  const result = await runJobBackfill(prisma, {
    send: SEND,
    log: (line) => console.log(line),
  });
  if (!SEND) console.log("\nRe-run against the admin route to actually send.\n");
  if (result.error) process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
