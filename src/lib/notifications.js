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
import { SITE_URL } from "./seo";
import { track, trackZeroMatch } from "./metrics";
import {
  MAX_ARTISANS_PER_JOB,
  dedupeKeyForJobMatch,
  dedupeKeyForQuote,
  rankArtisansForJob,
} from "./matching";

// Re-exported so callers and tests have one import site for the whole feature,
// while the rules themselves live in a database-free module.
export { MAX_ARTISANS_PER_JOB, dedupeKeyForJobMatch, dedupeKeyForQuote, rankArtisansForJob };

/** Emails go out in small batches so one job post cannot open 15 sockets at once. */
const EMAIL_BATCH = 4;

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
 * @returns {Promise<Array<{ id: string, name: string, email: string|null, city: string|null, sameCity: boolean }>>}
 */
export async function findEligibleArtisansForJob(job, limit = MAX_ARTISANS_PER_JOB) {
  const { categoryId, city, excludeUserId } = job;
  if (!categoryId) return [];

  const candidates = await prisma.user.findMany({
    where: {
      role: "ARTISAN",
      // The customer must never be notified about their own job.
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      // "Offers this trade" is the only hard requirement.
      services: { some: { categoryId } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      city: true,
      featuredUntil: true,
      proUntil: true,
      createdAt: true,
    },
  });

  return rankArtisansForJob(candidates, { city, limit });
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

function jobEmailHtml({ artisanName, job, categoryName, sameCity }) {
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

  const outOfCityNote = sameCity
    ? ""
    : '<p style="margin:0 0 14px;padding:10px 12px;background:#fff7ed;border-radius:8px;color:#9a3412;font-size:13px">' +
      "Note: this job is in <strong>" +
      esc(job.city) +
      "</strong>, which is outside your listed city. Only quote if you can cover it." +
      "</p>";

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
    "A customer just posted a job that matches what you do" +
    (sameCity ? " in " + esc(job.city) : "") +
    ". Quote first and you are usually the one who gets it.</p>" +
    outOfCityNote +
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
    '<p style="margin:16px 0 0;color:#94a3b8;font-size:12px">You are getting this because you list ' +
    esc(categoryName) +
    " on NaijaArtisans.</p>" +
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

    track("job_match_evaluated", {
      jobId: job.id,
      city: job.city,
      categoryId: job.categoryId,
      eligible: eligible.length,
      sameCity: eligible.filter((a) => a.sameCity).length,
    });

    if (eligible.length === 0) {
      // Logged loudly: the customer's job looks posted either way, so a zero
      // match is invisible unless something says it out loud.
      trackZeroMatch({ jobId: job.id, categoryId: job.categoryId, city: job.city });
      return empty;
    }

    const sameCityById = new Map(eligible.map((a) => [a.id, a.sameCity]));

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
        sameCity: sameCityById.get(n.userId) !== false,
      })
    );

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
      sameCity: true,
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
