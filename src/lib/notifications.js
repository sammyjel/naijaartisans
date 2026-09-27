// Job -> artisan notification.
//
// This is the fix for the failure that was costing the marketplace real money:
// POST /api/jobs persisted a job and returned, and nothing else happened. Five
// of the first nine jobs therefore received no quote at all, while 60 registered
// artisans never learned the jobs existed.
//
// Design notes worth keeping:
//
//   * IDEMPOTENCY IS IN THE DATABASE, not here. Every row carries a dedupeKey
//     ("job:<jobId>:artisan:<artisanId>") with a UNIQUE index, and inserts go
//     through createMany({ skipDuplicates: true }). A retried job POST inserts
//     zero rows rather than notifying everyone twice.
//
//   * EMAIL FOLLOWS THE ROWS. After inserting, we email only the notifications
//     whose emailStatus is still PENDING. That is what makes a retry safe end to
//     end: already-SENT rows are skipped without needing to remember anything
//     in memory.
//
//   * NOTHING HERE THROWS INTO THE CALLER. A job that is saved but unannounced
//     is recoverable (retryPendingNotificationEmails); a 500 on a job the
//     customer already believes they posted is not.

import { prisma } from "./prisma";
import { sendEmail, emailConfigured } from "./email";
import { notifyOperator } from "./alerts";
import { SITE_URL } from "./seo";
import { track, trackZeroMatch } from "./metrics";
import {
  MAX_ARTISANS_PER_JOB,
  NOTIFY_SCOPE,
  dedupeKeyForJobMatch,
  dedupeKeyForQuote,
  rankArtisansForJob,
} from "./matching";

// Re-exported so callers and tests have one import site for the whole feature,
// while the rules themselves live in a database-free module.
export {
  MAX_ARTISANS_PER_JOB,
  NOTIFY_SCOPE,
  dedupeKeyForJobMatch,
  dedupeKeyForQuote,
  rankArtisansForJob,
};

/**
 * How many emails go out concurrently.
 *
 * Broadcasting to every artisan means ~45 sends per job, so this is the
 * difference between a job post taking ~2s and ~10s. Kept modest anyway: a
 * burst of 45 parallel requests is how you get rate-limited by Resend, and a
 * rate-limited send is a notification nobody receives.
 */
const EMAIL_BATCH = 8;

/**
 * Chooses which artisans should hear about a job.
 *
 * Deterministic and driven entirely by columns that already existed: an artisan
 * qualifies by offering a service in the job's category.
 *
 * One query, then ranking in memory (see rankArtisansForJob). That is the right
 * trade at this size — tens of artisans per category; if a category ever holds
 * thousands this becomes a SQL ORDER BY on the same key.
 *
 * @param {{ categoryId: string, city: string, excludeUserId?: string }} job
 * @param {number} [limit]
 * @returns {Promise<Array<{ id: string, name: string, email: string|null, city: string|null, matchesTrade: boolean, sameCity: boolean, tier: number }>>}
 */
export async function findEligibleArtisansForJob(job, limit = MAX_ARTISANS_PER_JOB) {
  const { categoryId, city, excludeUserId } = job;
  if (!categoryId) return [];

  const candidates = await prisma.user.findMany({
    where: {
      role: "ARTISAN",
      // The customer must never be notified about their own job.
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      // Default scope is "all": every registered artisan hears about every job.
      // JOB_NOTIFY_SCOPE=matched narrows it to artisans who list this trade.
      ...(NOTIFY_SCOPE === "matched" ? { services: { some: { categoryId } } } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      featuredUntil: true,
      proUntil: true,
      createdAt: true,
      // Whether they list THIS trade, fetched as part of the same query rather
      // than one lookup per artisan. Drives both the ranking and the wording of
      // the email, so nobody is left wondering why they got a job outside their
      // line of work.
      services: { where: { categoryId }, select: { id: true }, take: 1 },
    },
  });

  return rankArtisansForJob(
    candidates.map((a) => ({ ...a, matchesTrade: a.services.length > 0 })),
    { city, limit }
  );
}

// -- email rendering --------------------------------------------------------

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

/** Absolute link - an email cannot follow a relative path. */
function abs(path) {
  return String(SITE_URL).replace(/\/+$/, "") + path;
}

/**
 * Builds the one-line explanation of why this artisan received this job, and the
 * banner shown when it is outside their trade or city.
 *
 * Being explicit about relevance is what keeps a broadcast from reading as spam:
 * an artisan who is told "this is outside your usual trade" can ignore it without
 * concluding our emails are worthless.
 */
function relevanceCopy({ tier, job }) {
  switch (tier) {
    case 0:
      return {
        lead: "A customer just posted a job that matches what you do in " + esc(job.city) + ".",
        banner: "",
      };
    case 1:
      return {
        lead: "A customer just posted a job that matches your trade.",
        banner:
          '<p style="margin:0 0 14px;padding:10px 12px;background:#fff7ed;border-radius:8px;color:#9a3412;font-size:13px">' +
          "This job is in <strong>" +
          esc(job.city) +
          "</strong>, outside your listed city. Only quote if you can cover it.</p>",
      };
    case 2:
      return {
        lead: "A customer in " + esc(job.city) + " just posted a job.",
        banner:
          '<p style="margin:0 0 14px;padding:10px 12px;background:#f1f5f9;border-radius:8px;color:#475569;font-size:13px">' +
          "This is outside the trade on your profile, but it is in your city. " +
          "Quote if you can do the work, or ignore it.</p>",
      };
    default:
      return {
        lead: "A new job has been posted on NaijaArtisans.",
        banner:
          '<p style="margin:0 0 14px;padding:10px 12px;background:#f1f5f9;border-radius:8px;color:#475569;font-size:13px">' +
          "You are getting this because every registered artisan is alerted to every " +
          "new job. It is outside your listed trade and city — ignore it if it is not for you.</p>",
      };
  }
}

function jobEmailHtml({ artisanName, job, categoryName, tier }) {
  const cta = abs("/jobs/" + job.id);
  const rows = [
    ["Service", categoryName],
    ["Location", job.city],
    job.budget ? ["Customer's budget", naira(job.budget)] : null,
  ].filter(Boolean);

  const rowHtml = rows
    .map(
      ([l, v]) =>
        '<tr><td style="padding:6px 12px 6px 0;color:#64748b;font-size:13px;white-space:nowrap">' +
        esc(l) +
        '</td><td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:600">' +
        esc(v) +
        "</td></tr>"
    )
    .join("");

  const { lead, banner } = relevanceCopy({ tier, job });

  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:560px">' +
    '<div style="background:#0f4a80;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75">NaijaArtisans</div>' +
    '<div style="font-size:18px;font-weight:800;margin-top:2px">New job available</div>' +
    "</div>" +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:18px">' +
    '<p style="margin:0 0 6px;color:#334155;font-size:14px">Hi ' +
    esc(artisanName || "there") +
    ",</p>" +
    '<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">' +
    lead +
    " Quote first and you are usually the one who gets it.</p>" +
    banner +
    '<p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#0f172a">' +
    esc(job.title) +
    "</p>" +
    '<p style="margin:0 0 14px;color:#475569;font-size:14px;line-height:1.55">' +
    esc(String(job.description || "").slice(0, 400)) +
    "</p>" +
    '<table style="border-collapse:collapse;width:100%">' +
    rowHtml +
    "</table>" +
    '<p style="margin:18px 0 0">' +
    '<a href="' +
    esc(cta) +
    '" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;font-size:14px">View job &amp; send a quote</a>' +
    "</p>" +
    '<p style="margin:16px 0 0;color:#94a3b8;font-size:12px">' +
    (tier <= 1
      ? "You are getting this because you list " + esc(categoryName) + " on NaijaArtisans."
      : "You are getting this because NaijaArtisans alerts every registered artisan to every new job.") +
    "</p>" +
    "</div></div>"
  );
}

function quoteEmailHtml({ customerName, body, jobTitle, jobId }) {
  const cta = abs("/jobs/" + jobId);
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:560px">' +
    '<div style="background:#0f4a80;color:#fff;padding:14px 18px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:18px;font-weight:800">You have a new quote</div></div>' +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:18px">' +
    '<p style="margin:0 0 12px;color:#334155;font-size:14px">Hi ' +
    esc(customerName || "there") +
    ", " +
    esc(body) +
    "</p>" +
    '<p style="margin:0 0 14px;color:#475569;font-size:14px">Job: <strong>' +
    esc(jobTitle) +
    "</strong></p>" +
    '<p style="margin:18px 0 0"><a href="' +
    esc(cta) +
    '" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:700;font-size:14px">See the quote</a></p>' +
    "</div></div>"
  );
}

// -- delivery --------------------------------------------------------------

/**
 * Sends the email for notifications still marked PENDING and records the outcome
 * on each row. Returns counts; never throws.
 *
 * @param {Array<any>} pending
 * @param {(n:any)=>string} renderHtml
 */
async function deliverPending(pending, renderHtml) {
  let emailed = 0;
  let failed = 0;
  let skipped = 0;

  if (pending.length === 0) return { emailed, failed, skipped };

  if (!emailConfigured()) {
    // Mark rather than leave PENDING forever: PENDING must mean "still owed an
    // email", otherwise the retry path grows without bound on an install that has
    // no email configured at all. The in-app notification still stands.
    const ids = pending.map((n) => n.id);
    await prisma.notification
      .updateMany({
        where: { id: { in: ids } },
        data: { emailStatus: "SKIPPED", emailError: "RESEND_API_KEY not set" },
      })
      .catch(() => {});
    track("notification_email", { skipped: ids.length, reason: "not_configured" });
    return { emailed: 0, failed: 0, skipped: ids.length };
  }

  for (let i = 0; i < pending.length; i += EMAIL_BATCH) {
    const batch = pending.slice(i, i + EMAIL_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (n) => {
        if (!n.user || !n.user.email) {
          await prisma.notification.update({
            where: { id: n.id },
            data: { emailStatus: "SKIPPED", emailError: "recipient has no email address" },
          });
          return "skipped";
        }
        const res = await sendEmail({
          to: n.user.email,
          subject: n.title,
          html: renderHtml(n),
        });
        await prisma.notification.update({
          where: { id: n.id },
          data: res.sent
            ? {
                emailStatus: "SENT",
                emailSentAt: new Date(),
                emailAttempts: { increment: 1 },
                emailError: null,
              }
            : {
                emailStatus: "FAILED",
                emailAttempts: { increment: 1 },
                emailError: String(res.reason || "unknown").slice(0, 300),
              },
        });
        return res.sent ? "sent" : "failed";
      })
    );

    for (const r of results) {
      if (r.status === "rejected") {
        failed += 1;
        continue;
      }
      if (r.value === "sent") emailed += 1;
      else if (r.value === "skipped") skipped += 1;
      else failed += 1;
    }
  }

  track("notification_email", { emailed, failed, skipped });
  return { emailed, failed, skipped };
}

/**
 * Emails the site owner every time a job is posted, so it can be followed up by
 * hand while the marketplace is still small enough for that to be worth doing.
 *
 * Goes through notifyOperator (src/lib/alerts.js), which already owns "the
 * owner's inbox" for this site — recipient comes from OPERATOR_ALERT_EMAIL.
 * Adding a second mechanism for the same idea is how one of them ends up stale
 * and the alerts nobody receives are the ones nobody notices.
 *
 * The delivery counts are included deliberately. "A job was posted" is only half
 * the story; what the owner needs to know is whether anyone actually heard about
 * it, and the difference between 45 emailed and 45 failed is invisible otherwise.
 *
 * @param {{id:string,title:string,description:string,city:string,budget:number|null}} job
 * @param {string} categoryName
 * @param {{eligible:number,created:number,emailed:number,failed:number,skipped:number,onTrade:number}} stats
 */
export function alertOwnerOfJob(job, categoryName, stats) {
  const base = String(SITE_URL).replace(/\/+$/, "");
  const reachedNobody = stats.emailed === 0;

  return notifyOperator({
    title: reachedNobody ? "New job posted — BUT NOBODY WAS EMAILED" : "New job posted",
    subject: reachedNobody
      ? `[NaijaArtisans] Job posted but 0 artisans emailed — ${job.title}`
      : `[NaijaArtisans] New job: ${job.title} (${stats.emailed} artisans emailed)`,
    urgent: reachedNobody,
    intro: reachedNobody
      ? "A customer posted a job and no artisan received an email. The job is live on the board, but nobody has been told about it. Check RESEND_API_KEY and that artisan accounts have email addresses."
      : `A customer posted a job and ${stats.emailed} artisan${stats.emailed === 1 ? " was" : "s were"} emailed. Follow up if no quotes arrive.`,
    rows: [
      ["Job", job.title],
      ["Service", categoryName],
      ["City", job.city],
      job.budget ? ["Budget", "₦" + Number(job.budget).toLocaleString("en-NG")] : null,
      ["Artisans alerted", String(stats.created)],
      ["Emails sent", String(stats.emailed)],
      stats.failed ? ["Emails FAILED", String(stats.failed)] : null,
      // Almost always "artisan has no email address" — worth surfacing, because
      // it is silently capping reach and is fixable by chasing those accounts.
      stats.skipped ? ["Skipped (no email)", String(stats.skipped)] : null,
      ["Matching this trade", `${stats.onTrade} of ${stats.eligible}`],
      ["Description", String(job.description || "").slice(0, 300)],
    ].filter(Boolean),
    cta: { label: "Open the job", href: `${base}/jobs/${job.id}` },
  });
}

// -- public API ------------------------------------------------------------

/**
 * Notifies matching artisans about a newly created job.
 *
 * MUST be called only after the job is committed - a notification for a job that
 * failed to save sends artisans to a 404 and destroys the trust this whole
 * feature exists to build.
 *
 * @param {{id:string,title:string,description:string,city:string,budget:number|null,categoryId:string,customerId:string,category?:{name?:string}}} job
 * @returns {Promise<{eligible:number,created:number,emailed:number,failed:number,skipped:number}>}
 */
export async function notifyArtisansOfJob(job) {
  const empty = { eligible: 0, created: 0, emailed: 0, failed: 0, skipped: 0 };
  try {
    const categoryName = (job.category && job.category.name) || "your trade";
    const eligible = await findEligibleArtisansForJob({
      categoryId: job.categoryId,
      city: job.city,
      excludeUserId: job.customerId,
    });

    const onTrade = eligible.filter((a) => a.matchesTrade).length;

    track("job_match_evaluated", {
      jobId: job.id,
      city: job.city,
      categoryId: job.categoryId,
      scope: NOTIFY_SCOPE,
      eligible: eligible.length,
      onTrade,
      sameCity: eligible.filter((a) => a.sameCity).length,
    });

    if (eligible.length === 0) {
      // Logged loudly: the customer's job looks posted either way, so a job that
      // reached nobody is invisible unless something says it out loud. The owner
      // is told too — with a broadcast configured, zero recipients means every
      // artisan account is missing or excluded, which is a fault, not a quiet day.
      trackZeroMatch({ jobId: job.id, categoryId: job.categoryId, city: job.city });
      await alertOwnerOfJob(job, categoryName, {
        eligible: 0,
        created: 0,
        emailed: 0,
        failed: 0,
        skipped: 0,
        onTrade: 0,
      }).catch(() => {});
      return empty;
    }

    const tierById = new Map(eligible.map((a) => [a.id, a.tier]));

    const created = await prisma.notification.createMany({
      data: eligible.map((a) => ({
        userId: a.id,
        type: "NEW_JOB_MATCH",
        title: "New " + categoryName.toLowerCase() + " job in " + job.city,
        body: job.title,
        url: "/jobs/" + job.id,
        jobRequestId: job.id,
        dedupeKey: dedupeKeyForJobMatch(job.id, a.id),
      })),
      skipDuplicates: true, // <- the idempotency guarantee
    });

    track("notifications_created", {
      jobId: job.id,
      created: created.count,
      eligible: eligible.length,
    });

    // Email only what is still owed an email.
    const pending = await prisma.notification.findMany({
      where: { jobRequestId: job.id, type: "NEW_JOB_MATCH", emailStatus: "PENDING" },
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        userId: true,
        user: { select: { name: true, email: true } },
      },
    });

    const res = await deliverPending(pending, (n) =>
      jobEmailHtml({
        artisanName: n.user && n.user.name,
        job,
        categoryName,
        tier: tierById.has(n.userId) ? tierById.get(n.userId) : 3,
      })
    );

    // Tell the owner, so a job can be followed up by hand. Last, and never
    // allowed to throw: the artisans have already been emailed by this point,
    // and failing the job post over the owner's own copy would be absurd.
    await alertOwnerOfJob(job, categoryName, {
      eligible: eligible.length,
      created: created.count,
      emailed: res.emailed,
      failed: res.failed,
      skipped: res.skipped,
      onTrade,
    }).catch((e) => console.error("[notifications] owner alert failed:", e));

    return {
      eligible: eligible.length,
      created: created.count,
      emailed: res.emailed,
      failed: res.failed,
      skipped: res.skipped,
    };
  } catch (e) {
    // The job is already saved. Log and let the retry path pick it up.
    console.error("[notifications] notifyArtisansOfJob failed:", e);
    return empty;
  }
}

/**
 * Tells the customer an artisan has quoted. Closes the loop the funnel needs:
 * without it, a customer who posted once has no reason to come back.
 *
 * @param {{id:string,price:number|null}} quote
 * @param {{id:string,title:string,customerId:string}} job
 * @param {{name:string}} artisan
 */
export async function notifyCustomerOfQuote(quote, job, artisan) {
  try {
    const dedupeKey = dedupeKeyForQuote(quote.id, job.customerId);
    const body = quote.price
      ? artisan.name + " quoted " + naira(quote.price) + "."
      : artisan.name + " sent you a quote.";

    const created = await prisma.notification.createMany({
      data: [
        {
          userId: job.customerId,
          type: "NEW_QUOTE",
          title: 'New quote on "' + job.title + '"',
          body,
          url: "/jobs/" + job.id,
          jobRequestId: job.id,
          dedupeKey,
        },
      ],
      skipDuplicates: true,
    });

    const pending = await prisma.notification.findMany({
      where: { dedupeKey, emailStatus: "PENDING" },
      select: {
        id: true,
        title: true,
        body: true,
        url: true,
        user: { select: { name: true, email: true } },
      },
    });

    await deliverPending(pending, (n) =>
      quoteEmailHtml({
        customerName: n.user && n.user.name,
        body: n.body,
        jobTitle: job.title,
        jobId: job.id,
      })
    );

    return { created: created.count };
  } catch (e) {
    console.error("[notifications] notifyCustomerOfQuote failed:", e);
    return { created: 0 };
  }
}

/**
 * Retry path for emails that failed or were never attempted (a Resend outage, a
 * function timeout mid-fan-out). Safe to call repeatedly and safe to wire to a
 * cron later; it only ever looks at rows still owed an email.
 *
 * @param {{ limit?: number, maxAttempts?: number }} [opts]
 */
export async function retryPendingNotificationEmails(opts = {}) {
  const limit = opts.limit ?? 50;
  const maxAttempts = opts.maxAttempts ?? 3;

  const stuck = await prisma.notification.findMany({
    where: {
      emailStatus: { in: ["PENDING", "FAILED"] },
      emailAttempts: { lt: maxAttempts },
      type: "NEW_JOB_MATCH",
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      url: true,
      userId: true,
      user: { select: { name: true, email: true } },
      jobRequest: {
        select: {
          id: true,
          title: true,
          description: true,
          city: true,
          budget: true,
          category: { select: { name: true } },
        },
      },
    },
  });

  const usable = stuck.filter((n) => n.jobRequest);
  if (usable.length === 0) return { attempted: 0, emailed: 0, failed: 0, skipped: 0 };

  // FAILED rows are being retried, so put them back into the state
  // deliverPending acts on.
  await prisma.notification.updateMany({
    where: { id: { in: usable.map((n) => n.id) } },
    data: { emailStatus: "PENDING" },
  });

  const res = await deliverPending(usable, (n) =>
    jobEmailHtml({
      artisanName: n.user && n.user.name,
      job: n.jobRequest,
      categoryName: (n.jobRequest.category && n.jobRequest.category.name) || "your trade",
      // Tier 3 is the neutral "every artisan is alerted to every job" wording.
      // A retry runs long after the original send, and recomputing each
      // recipient's exact relevance would mean re-querying their services for a
      // difference of one sentence — the generic version is honest either way.
      tier: 3,
    })
  );
  return { attempted: usable.length, ...res };
}

/** Unread badge count for the dashboard. */
export async function unreadNotificationCount(userId) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Lists a user's notifications, newest first. */
export async function listNotifications(userId, limit = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      url: true,
      readAt: true,
      createdAt: true,
    },
  });
}

/**
 * Marks one notification, or all of a user's unread ones, as read. Always scoped
 * by userId so one user can never mark another's notifications.
 */
export async function markNotificationsRead(userId, notificationId) {
  const where = notificationId ? { id: notificationId, userId } : { userId, readAt: null };
  const res = await prisma.notification.updateMany({ where, data: { readAt: new Date() } });
  return res.count;
}
