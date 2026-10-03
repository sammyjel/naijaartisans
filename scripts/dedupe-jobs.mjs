// Finds jobs the same person posted twice and closes the extras.
//
//   node --env-file=.env scripts/dedupe-jobs.mjs          # dry run (default)
//   node --env-file=.env scripts/dedupe-jobs.mjs --apply  # actually close them
//
// A duplicate costs more than clutter: both copies get a /jobs/<id> URL in the
// sitemap and, when the poster is a customer, both claim to be a vacancy. Google
// calls that duplicate content, and the two pages compete with each other.
//
// ── WHY IT CLOSES RATHER THAN DELETES ──────────────────────────────────────
//
// CLOSED is reversible and keeps whatever a duplicate already collected — a
// quote on the copy is still somebody's real reply. Deleting would throw that
// away to tidy a listing. Closed jobs already drop out of the sitemap and carry
// noindex (see lib/job-seo.js), so closing achieves the whole SEO goal.
//
// The OLDEST copy is always the one kept: it is the one with the most time to
// have accumulated quotes, and the one any existing link points at.

import { PrismaClient } from "@prisma/client";

const apply = process.argv.includes("--apply");
const prisma = new PrismaClient({ log: ["error"] });

/** Same poster + same normalised title = the same posting typed twice. */
function key(job) {
  const title = job.title.trim().toLowerCase().replace(/\s+/g, " ");
  return `${job.customerId}::${title}`;
}

const jobs = await prisma.jobRequest.findMany({
  where: { status: "OPEN" },
  orderBy: { createdAt: "asc" }, // oldest first, so the keeper comes first
  select: {
    id: true, title: true, city: true, createdAt: true, customerId: true,
    customer: { select: { name: true, role: true } },
    _count: { select: { quotes: true } },
  },
});

const groups = new Map();
for (const job of jobs) {
  const k = key(job);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(job);
}

const dupes = [...groups.values()].filter((g) => g.length > 1);

if (dupes.length === 0) {
  console.log(`\nNo duplicates among ${jobs.length} open jobs.\n`);
  await prisma.$disconnect();
  process.exit(0);
}

console.log(`\n${dupes.length} duplicated posting(s) among ${jobs.length} open jobs:\n`);

const toClose = [];
for (const group of dupes) {
  const [keep, ...extras] = group;
  console.log(`  "${keep.title}" — ${keep.customer?.name} [${keep.customer?.role}]`);
  console.log(`    KEEP   ${keep.id}  posted ${keep.createdAt.toISOString().slice(0, 10)}  ${keep._count.quotes} quote(s)`);
  for (const e of extras) {
    console.log(`    CLOSE  ${e.id}  posted ${e.createdAt.toISOString().slice(0, 10)}  ${e._count.quotes} quote(s)`);
    toClose.push(e);
  }
  console.log("");
}

// A duplicate that collected a quote is a judgement call, not a cleanup. Closing
// it would strand somebody's real reply on a page nobody is looking at.
const withQuotes = toClose.filter((j) => j._count.quotes > 0);
if (withQuotes.length) {
  console.log("SKIPPING these — a duplicate with quotes on it needs a human decision:");
  for (const j of withQuotes) console.log(`    ${j.id}  ${j._count.quotes} quote(s)  "${j.title}"`);
  console.log("");
}

const safe = toClose.filter((j) => j._count.quotes === 0);

if (!safe.length) {
  console.log("Nothing safe to close automatically.\n");
  await prisma.$disconnect();
  process.exit(0);
}

if (!apply) {
  console.log(`DRY RUN — would close ${safe.length} duplicate(s). Re-run with --apply to do it.\n`);
  await prisma.$disconnect();
  process.exit(0);
}

const result = await prisma.jobRequest.updateMany({
  where: { id: { in: safe.map((j) => j.id) }, status: "OPEN" },
  data: { status: "CLOSED" },
});

console.log(`Closed ${result.count} duplicate(s).`);
console.log("The sitemap and job pages refresh on their own revalidate cycle.\n");

await prisma.$disconnect();
