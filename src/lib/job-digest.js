// Backfill: alert every artisan to the OPEN jobs posted before the notification
// system existed.
//
// This lives in src/lib rather than inside the script because it has to run in
// two places with identical behaviour:
//
//   scripts/backfill-job-alerts.mjs   local dry runs and inspection
//   POST /api/admin/notifications/backfill   the actual send
//
// The send has to happen on Vercel: RESEND_API_KEY is a Sensitive environment
// variable, so `vercel env pull` returns it empty and no local process can read
// it. Two copies of an email template that goes to the whole artisan roster is
// exactly the kind of thing that drifts, so there is one copy, here.
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
// Two separate guarantees, because the first one alone was not enough:
//
//   in-app   rows carry the same dedupeKey as the live system
//            ("job:<id>:artisan:<id>") and are inserted with skipDuplicates.
//
//   email    an artisan holding a SENT notification for any of these jobs is
//            dropped from the recipient list entirely.
//
// The email half was missing on the first run. Rate limiting cost 17 of 45
// digests, and a retry would have sent the 28 who succeeded a second copy of
// the same 8 jobs — the dedupeKey would have happily skipped the in-app rows
// while the email went out again. A re-run now emails only who is still owed.

import { rankArtisansForJob } from "./matching.js";
import { sendEmail, emailConfigured } from "./email.js";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const ageDays = (d) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);

function jobCard(job, highlight, site) {
  const bits = [job.category.name, job.city, job.budget ? naira(job.budget) : null]
    .filter(Boolean)
    .map(esc)
    .join(" &middot; ");
  return (
    '<tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0">' +
    (highlight
      ? '<span style="display:inline-block;background:#dcfce7;color:#166534;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px;margin-bottom:5px">MATCHES YOUR TRADE</span><br>'
      : "") +
    '<a href="' +
    esc(`${site}/jobs/${job.id}`) +
    '" style="color:#0f4a80;font-weight:700;font-size:15px;text-decoration:none">' +
    esc(job.title) +
    "</a>" +
    '<div style="color:#64748b;font-size:13px;margin-top:3px">' +
    bits +
    "</div>" +
    '<div style="color:#94a3b8;font-size:12px;margin-top:2px">Posted ' +
    ageDays(job.createdAt) +
    " days ago" +
    (job._count.quotes === 0
      ? " &middot; <strong>no quotes yet</strong>"
      : ` &middot; ${job._count.quotes} quote(s) so far`) +
    "</div></td></tr>"
  );
}

/** The digest email body for one artisan. Exported so it can be asserted on. */
export function digestHtml({ artisanName, matching, others, site }) {
  const total = matching.length + others.length;
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:600px">' +
    '<div style="background:#0f4a80;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75">NaijaArtisans</div>' +
    `<div style="font-size:19px;font-weight:800;margin-top:2px">${total} open job${
      total === 1 ? "" : "s"
    } waiting for a quote</div>` +
    "</div>" +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:20px">' +
    `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">Hi ${esc(
      artisanName || "there"
    )},</p>` +
    '<p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.55">' +
    "These jobs are open on NaijaArtisans right now and most have had <strong>no response at all</strong>. " +
    "We have not been alerting artisans when a job came in — that is fixed, and this is the catch-up. " +
    "From now on you will hear about a job the moment it is posted." +
    "</p>" +
    (matching.length
      ? '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:.06em">For your trade</p>' +
        '<table style="width:100%;border-collapse:collapse;margin-bottom:18px">' +
        matching.map((j) => jobCard(j, true, site)).join("") +
        "</table>"
      : "") +
    (others.length
      ? `<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.06em">${
          matching.length ? "Other open jobs" : "Open jobs"
        }</p>` +
        '<table style="width:100%;border-collapse:collapse">' +
        others.map((j) => jobCard(j, false, site)).join("") +
        "</table>"
      : "") +
    '<p style="margin:22px 0 0"><a href="' +
    esc(`${site}/jobs`) +
    '" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">See all open jobs</a></p>' +
    '<p style="margin:18px 0 0;color:#94a3b8;font-size:12px">' +
    "You are getting this because you are registered as an artisan on NaijaArtisans. " +
    "Jobs outside your trade are included so you do not miss work you can do." +
    "</p></div></div>"
  );
}

function ownerSummaryHtml({ jobs, sent, failed, createdTotal, unreachable, recipientCount, site }) {
  const rows = [
    ["Open jobs included", String(jobs)],
    ["Digest emails sent", String(sent)],
    failed ? ["Failed", String(failed)] : null,
    ["Notifications created", String(createdTotal)],
    ["Artisans without an email address", String(unreachable)],
  ].filter(Boolean);

  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:560px">' +
    '<div style="background:#0f4a80;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:18px;font-weight:800">Backfill: open jobs sent to all artisans</div></div>' +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:18px">' +
    '<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">' +
    `${jobs} open job(s) went to ${sent} artisan(s), as a single digest each rather than ` +
    `${jobs * recipientCount} separate emails. These were posted before job alerts existed, ` +
    "which is why most had no quotes. Watch for replies over the next few days — if they stay at zero, " +
    "the problem is artisan responsiveness, not delivery.</p>" +
    '<table style="border-collapse:collapse;width:100%">' +
    rows
      .map(
        ([l, v]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px">${esc(l)}</td>` +
          `<td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">${esc(v)}</td></tr>`
      )
      .join("") +
    "</table>" +
    `<p style="margin:18px 0 0"><a href="${esc(
      site
    )}/jobs" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:700;font-size:14px">See the job board</a></p>` +
    "</div></div>"
  );
}

const EMAIL_BATCH = 8;

/**
 * Runs the backfill. With `send: false` nothing is written and nothing is sent —
 * it reports exactly what a send would do, which is how the recipient counts
 * were agreed before any real email went out.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ send?: boolean, site?: string, operatorEmail?: string, log?: (line: string) => void }} opts
 */
export async function runJobBackfill(prisma, opts = {}) {
  const send = Boolean(opts.send);
  const site = (opts.site || process.env.NEXT_PUBLIC_SITE_URL || "https://naijaartisans.com").replace(
    /\/+$/,
    ""
  );
  const operatorEmail = (
    opts.operatorEmail ||
    process.env.OPERATOR_ALERT_EMAIL ||
    process.env.LEAD_NOTIFY_EMAIL ||
    "sammyjelng@gmail.com"
  ).trim();
  const log = opts.log || (() => {});

  const jobs = await prisma.jobRequest.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      city: true,
      budget: true,
      createdAt: true,
      categoryId: true,
      customerId: true,
      category: { select: { name: true } },
      _count: { select: { quotes: true } },
    },
  });

  const artisans = await prisma.user.findMany({
    where: { role: "ARTISAN" },
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      featuredUntil: true,
      proUntil: true,
      createdAt: true,
      services: { select: { categoryId: true } },
    },
  });

  // Artisans who already have a digest-backed notification marked SENT for one
  // of these jobs have had their email. Excluding them is what makes a re-run
  // safe: the 2026-09-28 run lost 17 of 45 digests to rate limiting, and
  // without this a retry would have sent the other 28 a second copy. The
  // per-job dedupeKey protects the in-app rows; nothing protected the email.
  const alreadyEmailed = new Set(
    jobs.length
      ? (
          await prisma.notification.findMany({
            where: { jobRequestId: { in: jobs.map((j) => j.id) }, emailStatus: "SENT" },
            select: { userId: true },
            distinct: ["userId"],
          })
        ).map((n) => n.userId)
      : []
  );

  const recipients = artisans.filter((a) => a.email && !alreadyEmailed.has(a.id));
  const result = {
    send,
    openJobs: jobs.length,
    artisans: artisans.length,
    withEmail: recipients.length,
    withoutEmail: artisans.filter((a) => !a.email).length,
    alreadyEmailed: alreadyEmailed.size,
    notificationsCreated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    emailsSkipped: 0,
    perJob: [],
  };

  log(`${send ? "SENDING" : "DRY RUN (nothing will be sent)"}`);
  log(`  open jobs : ${jobs.length}`);
  log(
    `  artisans  : ${artisans.length} (${recipients.length} to email` +
      (alreadyEmailed.size ? `, ${alreadyEmailed.size} already emailed` : "") +
      `, ${result.withoutEmail} with no address)`
  );

  if (jobs.length === 0 || artisans.length === 0) {
    log("Nothing to do.");
    return result;
  }

  // ── in-app notifications, one per job per artisan (idempotent) ────────────

  for (const job of jobs) {
    const ranked = rankArtisansForJob(
      artisans
        .filter((a) => a.id !== job.customerId) // never alert the customer to their own job
        .map((a) => ({
          ...a,
          matchesTrade: a.services.some((s) => s.categoryId === job.categoryId),
        })),
      { city: job.city }
    );
    const onTrade = ranked.filter((r) => r.matchesTrade).length;

    let created = 0;
    if (send) {
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
      created = res.count;
      log(`  ${job.category.name} / ${job.city}: ${created} new notification(s)`);
    } else {
      created = ranked.length;
      log(`  ${job.category.name} / ${job.city}: would notify ${ranked.length} (${onTrade} on-trade)`);
    }

    result.notificationsCreated += created;
    result.perJob.push({
      jobId: job.id,
      title: job.title,
      category: job.category.name,
      city: job.city,
      ageDays: ageDays(job.createdAt),
      quotes: job._count.quotes,
      recipients: ranked.length,
      onTrade,
      notificationsCreated: created,
    });
  }

  log(`Digest emails: ${recipients.length} (one per artisan, covering all ${jobs.length} jobs)`);
  log(`Instead of ${jobs.length} x ${recipients.length} = ${jobs.length * recipients.length} separate emails.`);

  if (!send) {
    const sample = recipients[0];
    if (sample) {
      const matching = jobs.filter((j) => sample.services.some((s) => s.categoryId === j.categoryId));
      result.sample = {
        name: sample.name,
        onTradeJobs: matching.length,
        otherJobs: jobs.length - matching.length,
      };
      log(`Sample recipient: ${sample.name} — on-trade ${matching.length}, other ${jobs.length - matching.length}`);
    }
    return result;
  }

  if (!emailConfigured()) {
    // The notifications above are already committed, so this is reported rather
    // than thrown: the in-app half succeeded and should not be rolled back.
    result.error = "RESEND_API_KEY is not set — in-app notifications were created, but no email was sent.";
    log(result.error);
    return result;
  }

  // ── one digest email per artisan ──────────────────────────────────────────

  for (let i = 0; i < recipients.length; i += EMAIL_BATCH) {
    const batch = recipients.slice(i, i + EMAIL_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (a) => {
        const own = new Set(a.services.map((s) => s.categoryId));
        const matching = jobs.filter((j) => own.has(j.categoryId) && j.customerId !== a.id);
        const others = jobs.filter((j) => !own.has(j.categoryId) && j.customerId !== a.id);
        if (matching.length + others.length === 0) return "skipped";

        const res = await sendEmail({
          to: a.email,
          subject: `${matching.length + others.length} open jobs on NaijaArtisans — quote before someone else does`,
          html: digestHtml({ artisanName: a.name, matching, others, site }),
        });
        if (!res.sent) throw new Error(res.reason || "send failed");

        // Mark this artisan's backfilled notifications as emailed, so the live
        // retry path does not later send them a second time.
        await prisma.notification.updateMany({
          where: {
            userId: a.id,
            jobRequestId: { in: jobs.map((j) => j.id) },
            emailStatus: "PENDING",
          },
          data: { emailStatus: "SENT", emailSentAt: new Date(), emailAttempts: { increment: 1 } },
        });
        return "sent";
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled" && r.value === "sent") result.emailsSent += 1;
      else if (r.status === "fulfilled") result.emailsSkipped += 1;
      else result.emailsFailed += 1;
    }
    log(`  ${Math.min(i + EMAIL_BATCH, recipients.length)}/${recipients.length} processed…`);
  }

  log(
    `Done. ${result.emailsSent} digest email(s) sent, ${result.emailsFailed} failed, ` +
      `${result.notificationsCreated} notification(s) created.`
  );

  await sendEmail({
    to: operatorEmail,
    subject: `[NaijaArtisans] Backfill sent: ${jobs.length} open jobs to ${result.emailsSent} artisans`,
    html: ownerSummaryHtml({
      jobs: jobs.length,
      sent: result.emailsSent,
      failed: result.emailsFailed,
      createdTotal: result.notificationsCreated,
      unreachable: result.withoutEmail,
      recipientCount: recipients.length,
      site,
    }),
  }).catch((e) => log("owner summary failed: " + e.message));

  return result;
}
