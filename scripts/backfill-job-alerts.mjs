// One-off: alert every artisan to the OPEN jobs that were posted before the
// notification system existed.
//
//   node scripts/backfill-job-alerts.mjs            dry run - sends nothing
//   node scripts/backfill-job-alerts.mjs --send     actually sends
//
// ── WHY A DIGEST, NOT ONE EMAIL PER JOB ────────────────────────────────────
//
// 8 open jobs x 45 artisans with an address = 360 emails. Sent as 360 separate
// messages that is a spam complaint waiting to happen, and the first thing it
// would cost is the deliverability of every future job alert — the exact system
// this backfill exists to make useful.
//
// So each artisan gets ONE email listing all the open jobs, with the ones
// matching their trade at the top. The in-app notifications are still created
// per job, because those are free and each one needs its own link.
//
// ── IDEMPOTENCY ────────────────────────────────────────────────────────────
//
// Rows carry the same dedupeKey as the live system ("job:<id>:artisan:<id>"),
// inserted with skipDuplicates, and only notifications still marked PENDING are
// emailed. Running this twice notifies nobody twice. That matters more than
// usual here: a duplicate backfill would send all 45 artisans a second copy of
// the same 8 jobs.

import { PrismaClient } from "@prisma/client";
import { readFileSync, existsSync } from "node:fs";
import { rankArtisansForJob } from "../src/lib/matching.js";
import { sendEmail, emailConfigured } from "../src/lib/email.js";

// NOTE: src/lib/alerts.js is deliberately NOT imported. It does
// `import ... from "./email"` with no file extension, which Next's bundler
// resolves and plain Node ESM does not. Rather than change app code to suit a
// one-off script, the owner summary below goes through sendEmail directly.
const OPERATOR_EMAIL = (
  process.env.OPERATOR_ALERT_EMAIL ||
  process.env.LEAD_NOTIFY_EMAIL ||
  "sammyjelng@gmail.com"
).trim();

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

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://naijaartisans.com").replace(/\/+$/, "");
const prisma = new PrismaClient({ datasources: { db: { url } }, log: [] });

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const ageDays = (d) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);

function jobCard(job, highlight) {
  const bits = [job.category.name, job.city, job.budget ? naira(job.budget) : null]
    .filter(Boolean)
    .map(esc)
    .join(" &middot; ");
  return (
    '<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">' +
    (highlight
      ? '<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px;margin-bottom:5px">MATCHES YOUR TRADE</span><br>'
      : "") +
    '<a href="' + esc(`${SITE}/jobs/${job.id}`) +
    '" style="color:#0f4a80;font-weight:700;font-size:15px;text-decoration:none">' + esc(job.title) + "</a>" +
    '<div style="color:#64748b;font-size:13px;margin-top:3px">' + bits + "</div>" +
    '<div style="color:#94a3b8;font-size:12px;margin-top:2px">Posted ' + ageDays(job.createdAt) + " days ago" +
    (job._count.quotes === 0 ? " &middot; <strong>no quotes yet</strong>" : ` &middot; ${job._count.quotes} quote(s) so far`) +
    "</div></td></tr>"
  );
}

function digestHtml({ artisanName, matching, others }) {
  const total = matching.length + others.length;
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:600px">' +
    '<div style="background:#0f4a80;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75">NaijaArtisans</div>' +
    `<div style="font-size:19px;font-weight:800;margin-top:2px">${total} open job${total === 1 ? "" : "s"} waiting for a quote</div>` +
    "</div>" +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:20px">' +
    `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">Hi ${esc(artisanName || "there")},</p>` +
    '<p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.55">' +
    "These jobs are open on NaijaArtisans right now and most have had <strong>no response at all</strong>. " +
    "We have not been alerting artisans when a job came in — that is fixed, and this is the catch-up. " +
    "From now on you will hear about a job the moment it is posted." +
    "</p>" +
    (matching.length
      ? '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.06em">For your trade</p>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:18px">' + matching.map((j) => jobCard(j, true)).join("") + "</table>"
      : "") +
    (others.length
      ? `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${matching.length ? "Other open jobs" : "Open jobs"}</p>` +
        '<table style="width:100%;border-collapse:collapse">' + others.map((j) => jobCard(j, false)).join("") + "</table>"
      : "") +
    '<p style="margin:22px 0 0"><a href="' + esc(`${SITE}/jobs`) +
    '" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">See all open jobs</a></p>' +
    '<p style="margin:18px 0 0;color:#94a3b8;font-size:12px">' +
    "You are getting this because you are registered as an artisan on NaijaArtisans. " +
    "Jobs outside your trade are included so you do not miss work you can do." +
    "</p></div></div>"
  );
}

// ── gather ─────────────────────────────────────────────────────────────────

const jobs = await prisma.jobRequest.findMany({
  where: { status: "OPEN" },
  orderBy: { createdAt: "desc" },
  select: {
    id: true, title: true, city: true, budget: true, createdAt: true, categoryId: true, customerId: true,
    category: { select: { name: true } },
    _count: { select: { quotes: true } },
  },
});

const artisans = await prisma.user.findMany({
  where: { role: "ARTISAN" },
  select: {
    id: true, name: true, email: true, city: true, featuredUntil: true, proUntil: true, createdAt: true,
    services: { select: { categoryId: true } },
  },
});

console.log(`\n${SEND ? "SENDING" : "DRY RUN (nothing will be sent)"}`);
console.log(`  open jobs : ${jobs.length}`);
console.log(`  artisans  : ${artisans.length} (${artisans.filter((a) => a.email).length} with an email address)\n`);

if (jobs.length === 0 || artisans.length === 0) {
  console.log("Nothing to do.");
  await prisma.$disconnect();
  process.exit(0);
}

// ── create the in-app notifications (idempotent) ───────────────────────────

let createdTotal = 0;
for (const job of jobs) {
  const categoryOf = new Set();
  const ranked = rankArtisansForJob(
    artisans
      .filter((a) => a.id !== job.customerId) // never alert the customer to their own job
      .map((a) => ({ ...a, matchesTrade: a.services.some((s) => s.categoryId === job.categoryId) })),
    { city: job.city }
  );
  ranked.forEach((r) => categoryOf.add(r.id));

  if (SEND) {
    const res = await prisma.notification.createMany({
      data: ranked.map((a) => ({
        userId: a.id,
        type: "NEW_JOB_MATCH",
        title: `${job.category.name} job in ${job.city}`,
        body: job.title,
        url: `/jobs/${job.id}`,
        jobRequestId: job.id,
        dedupeKey: `job:${job.id}:artisan:${a.id}`,
      })),
      skipDuplicates: true,
    });
    createdTotal += res.count;
    console.log(`  ${job.category.name} / ${job.city}: ${res.count} new notification(s)`);
  } else {
    createdTotal += ranked.length;
    const onTrade = ranked.filter((r) => r.matchesTrade).length;
    console.log(`  ${job.category.name} / ${job.city}: would notify ${ranked.length} (${onTrade} on-trade)`);
  }
}

// ── one digest email per artisan ───────────────────────────────────────────

const recipients = artisans.filter((a) => a.email);
console.log(`\nDigest emails: ${recipients.length} (one per artisan, covering all ${jobs.length} jobs)`);
console.log(`Instead of ${jobs.length} x ${recipients.length} = ${jobs.length * recipients.length} separate emails.\n`);

if (!SEND) {
  const sample = recipients[0];
  if (sample) {
    const matching = jobs.filter((j) => sample.services.some((s) => s.categoryId === j.categoryId));
    console.log(`Sample recipient: ${sample.name} <${sample.email}>`);
    console.log(`  on-trade jobs: ${matching.length}, other jobs: ${jobs.length - matching.length}`);
  }
  console.log("\nRe-run with --send to actually send.\n");
  await prisma.$disconnect();
  process.exit(0);
}

if (!emailConfigured()) {
  console.error("RESEND_API_KEY is not set — in-app notifications were created, but no email can be sent.");
  await prisma.$disconnect();
  process.exit(1);
}

let sent = 0;
let failed = 0;
const BATCH = 8;

for (let i = 0; i < recipients.length; i += BATCH) {
  const batch = recipients.slice(i, i + BATCH);
  const results = await Promise.allSettled(
    batch.map(async (a) => {
      const own = new Set(a.services.map((s) => s.categoryId));
      const matching = jobs.filter((j) => own.has(j.categoryId) && j.customerId !== a.id);
      const others = jobs.filter((j) => !own.has(j.categoryId) && j.customerId !== a.id);
      if (matching.length + others.length === 0) return "skipped";

      const res = await sendEmail({
        to: a.email,
        subject: `${matching.length + others.length} open jobs on NaijaArtisans — quote before someone else does`,
        html: digestHtml({ artisanName: a.name, matching, others }),
      });
      if (!res.sent) throw new Error(res.reason || "send failed");

      // Mark this artisan's backfilled notifications as emailed, so the live
      // retry path does not later send them a second time.
      await prisma.notification.updateMany({
        where: { userId: a.id, jobRequestId: { in: jobs.map((j) => j.id) }, emailStatus: "PENDING" },
        data: { emailStatus: "SENT", emailSentAt: new Date(), emailAttempts: { increment: 1 } },
      });
      return "sent";
    })
  );
  for (const r of results) {
    if (r.status === "fulfilled" && r.value === "sent") sent += 1;
    else if (r.status === "rejected") failed += 1;
  }
  console.log(`  ${Math.min(i + BATCH, recipients.length)}/${recipients.length} processed…`);
}

console.log(`\nDone. ${sent} digest email(s) sent, ${failed} failed, ${createdTotal} notification(s) created.`);

const summaryRows = [
  ["Open jobs included", String(jobs.length)],
  ["Digest emails sent", String(sent)],
  failed ? ["Failed", String(failed)] : null,
  ["Notifications created", String(createdTotal)],
  ["Artisans without an email address", String(artisans.length - recipients.length)],
].filter(Boolean);

await sendEmail({
  to: OPERATOR_EMAIL,
  subject: `[NaijaArtisans] Backfill sent: ${jobs.length} open jobs to ${sent} artisans`,
  html:
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:560px">' +
    '<div style="background:#0f4a80;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:18px;font-weight:800">Backfill: open jobs sent to all artisans</div></div>' +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:18px">' +
    '<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">' +
    `${jobs.length} open job(s) went to ${sent} artisan(s), as a single digest each rather than ` +
    `${jobs.length * recipients.length} separate emails. These were posted before job alerts existed, ` +
    "which is why most had no quotes. Watch for replies over the next few days — if they stay at zero, " +
    "the problem is artisan responsiveness, not delivery.</p>" +
    '<table style="border-collapse:collapse;width:100%">' +
    summaryRows
      .map(
        ([l, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">${esc(l)}</td>` +
          `<td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td></tr>`
      )
      .join("") +
    "</table>" +
    `<p style="margin:18px 0 0"><a href="${esc(SITE)}/jobs" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px">See the job board</a></p>` +
    "</div></div>",
}).catch((e) => console.error("owner summary failed:", e.message));

await prisma.$disconnect();
