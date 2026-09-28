// Backfill: tell customers about quotes that arrived before the notification
// system existed.
//
// Four quotes are sitting on the board that their customer was never told
// about. Each one is an artisan who did the work of responding and a customer
// who never found out — the exact loop the marketplace exists to close, left
// open. Two of them are 14 and 7 days old.
//
// ── SHAPE ──────────────────────────────────────────────────────────────────
//
// One email per CUSTOMER, listing every job of theirs that has unseen quotes,
// with the quotes under it. Peter has two quotes on one job; mailing him twice
// about the same job would read as broken rather than helpful.
//
// In-app notifications stay one per quote, carrying the SAME dedupeKey the live
// path uses ("quote:<quoteId>:customer:<customerId>"). That is what stops this
// and notifyCustomerOfQuote ever double-notifying the same quote.
//
// ── IDEMPOTENCY ────────────────────────────────────────────────────────────
//
// Learned from the job backfill, where the dedupeKey protected the in-app rows
// while the email went out twice. Two guarantees, not one:
//
//   in-app  createMany({ skipDuplicates: true }) on the shared dedupeKey
//   email   a customer holding a SENT notification for one of these quotes is
//           dropped from the recipient list entirely
//
// So a re-run mails only whoever is still owed.

import { sendEmail, emailConfigured } from "./email.js";

const esc = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");
const ageDays = (d) => Math.round((Date.now() - new Date(d).getTime()) / 86400000);

/** The idempotency key the LIVE path uses. Must stay identical. */
export function dedupeKeyForQuote(quoteId, customerId) {
  return "quote:" + quoteId + ":customer:" + customerId;
}

function quoteRow(q) {
  return (
    '<tr><td style="padding:9px 0;border-bottom:1px solid #e2e8f0">' +
    '<span style="font-weight:700;color:#0f172a;font-size:14px">' +
    esc(q.artisan.name) +
    "</span>" +
    (q.price
      ? '<span style="float:right;font-weight:700;color:#0f4a80;font-size:14px">' + naira(q.price) + "</span>"
      : '<span style="float:right;color:#94a3b8;font-size:13px">price on request</span>') +
    '<div style="clear:both"></div>' +
    (q.message
      ? '<div style="color:#475569;font-size:13px;margin-top:3px">' + esc(String(q.message).slice(0, 160)) + "</div>"
      : "") +
    '<div style="color:#94a3b8;font-size:12px;margin-top:2px">' +
    esc(q.artisan.city || "") +
    (q.artisan.city ? " &middot; " : "") +
    "sent " + ageDays(q.createdAt) + " days ago</div>" +
    "</td></tr>"
  );
}

function digestHtml({ customerName, jobs, site }) {
  const totalQuotes = jobs.reduce((n, j) => n + j.quotes.length, 0);
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:600px">' +
    '<div style="background:#0f4a80;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75">NaijaArtisans</div>' +
    `<div style="font-size:19px;font-weight:800;margin-top:2px">You have ${totalQuotes} quote${
      totalQuotes === 1 ? "" : "s"
    } waiting</div></div>` +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:20px">' +
    `<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">Hi ${esc(
      customerName || "there"
    )},</p>` +
    '<p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.55">' +
    "Artisans replied to your job and we never told you — our notifications were not running at the time. " +
    "That is fixed, and this is the catch-up. Their quotes are below, along with their contact details on the site." +
    "</p>" +
    jobs
      .map(
        (j) =>
          '<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0f172a">' +
          esc(j.title) +
          '</p><table style="width:100%;border-collapse:collapse;margin-bottom:16px">' +
          j.quotes.map(quoteRow).join("") +
          '</table><p style="margin:-8px 0 18px"><a href="' +
          esc(`${site}/jobs/${j.id}`) +
          '" style="color:#0f4a80;font-weight:700;font-size:13px;text-decoration:none">See this job and hire &rarr;</a></p>'
      )
      .join("") +
    '<p style="margin:14px 0 0;color:#334155;font-size:14px;line-height:1.55">' +
    "When you hire someone, press <strong>Hire</strong> on their quote. That starts the job on the site, and when it is " +
    "finished you confirm it — which is how other customers get to see who actually delivers." +
    "</p>" +
    '<p style="margin:20px 0 0"><a href="' +
    esc(`${site}/dashboard`) +
    '" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">Open my dashboard</a></p>' +
    "</div></div>"
  );
}

const EMAIL_BATCH = 8;

/**
 * Runs the quote backfill.
 *
 * @param {import("@prisma/client").PrismaClient} prisma
 * @param {{ send?: boolean, site?: string, log?: (line: string) => void }} opts
 */
export async function runQuoteBackfill(prisma, opts = {}) {
  const send = Boolean(opts.send);
  const site = (opts.site || process.env.NEXT_PUBLIC_SITE_URL || "https://naijaartisans.com").replace(/\/+$/, "");
  const log = opts.log || (() => {});

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      price: true,
      message: true,
      createdAt: true,
      artisan: { select: { id: true, name: true, city: true } },
      jobRequest: {
        select: {
          id: true,
          title: true,
          customer: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Already-emailed customers are excluded, not just already-created rows.
  const sentKeys = new Set(
    (
      await prisma.notification.findMany({
        where: { type: "NEW_QUOTE", emailStatus: "SENT" },
        select: { dedupeKey: true },
      })
    ).map((n) => n.dedupeKey)
  );

  /** @type {Map<string, {customer: object, jobs: Map<string, object>}>} */
  const byCustomer = new Map();
  let pendingQuotes = 0;

  for (const q of quotes) {
    const customer = q.jobRequest.customer;
    // A customer cannot quote on their own job, but guard anyway rather than
    // discover it by emailing someone about their own message.
    if (customer.id === q.artisan.id) continue;
    if (sentKeys.has(dedupeKeyForQuote(q.id, customer.id))) continue;

    pendingQuotes += 1;
    if (!byCustomer.has(customer.id)) byCustomer.set(customer.id, { customer, jobs: new Map() });
    const entry = byCustomer.get(customer.id);
    if (!entry.jobs.has(q.jobRequest.id)) {
      entry.jobs.set(q.jobRequest.id, { id: q.jobRequest.id, title: q.jobRequest.title, quotes: [] });
    }
    entry.jobs.get(q.jobRequest.id).quotes.push(q);
  }

  const recipients = [...byCustomer.values()].map((e) => ({
    customer: e.customer,
    jobs: [...e.jobs.values()],
  }));
  const withEmail = recipients.filter((r) => r.customer.email);

  const result = {
    send,
    totalQuotes: quotes.length,
    pendingQuotes,
    customers: recipients.length,
    withEmail: withEmail.length,
    withoutEmail: recipients.length - withEmail.length,
    alreadyEmailed: new Set([...sentKeys]).size,
    notificationsCreated: 0,
    emailsSent: 0,
    emailsFailed: 0,
    perCustomer: recipients.map((r) => ({
      name: r.customer.name,
      hasEmail: Boolean(r.customer.email),
      jobs: r.jobs.length,
      quotes: r.jobs.reduce((n, j) => n + j.quotes.length, 0),
    })),
  };

  log(send ? "SENDING" : "DRY RUN (nothing will be sent)");
  log(`  quotes on the system : ${quotes.length}`);
  log(`  never notified       : ${pendingQuotes}`);
  log(`  customers to tell    : ${recipients.length} (${withEmail.length} with an email address)`);

  if (pendingQuotes === 0) {
    log("Every quote has already been notified. Nothing to do.");
    return result;
  }

  for (const r of recipients) {
    log(
      `  ${r.customer.name}: ${r.jobs.reduce((n, j) => n + j.quotes.length, 0)} quote(s) across ${r.jobs.length} job(s)` +
        (r.customer.email ? "" : "  [NO EMAIL — cannot be reached]")
    );
  }

  if (!send) return result;

  // In-app notifications, one per quote, on the live dedupeKey.
  for (const r of recipients) {
    for (const j of r.jobs) {
      const created = await prisma.notification.createMany({
        data: j.quotes.map((q) => ({
          userId: r.customer.id,
          type: "NEW_QUOTE",
          title: 'New quote on "' + j.title + '"',
          body: q.price
            ? q.artisan.name + " quoted " + naira(q.price) + "."
            : q.artisan.name + " sent you a quote.",
          url: "/jobs/" + j.id,
          jobRequestId: j.id,
          dedupeKey: dedupeKeyForQuote(q.id, r.customer.id),
        })),
        skipDuplicates: true,
      });
      result.notificationsCreated += created.count;
    }
  }
  log(`  in-app notifications created: ${result.notificationsCreated}`);

  if (!emailConfigured()) {
    result.error = "RESEND_API_KEY is not set — in-app notifications were created, but no email was sent.";
    log(result.error);
    return result;
  }

  for (let i = 0; i < withEmail.length; i += EMAIL_BATCH) {
    const batch = withEmail.slice(i, i + EMAIL_BATCH);
    const results = await Promise.allSettled(
      batch.map(async (r) => {
        const res = await sendEmail({
          to: r.customer.email,
          subject: `You have quotes waiting on NaijaArtisans`,
          html: digestHtml({ customerName: r.customer.name, jobs: r.jobs, site }),
        });
        if (!res.sent) throw new Error(res.reason || "send failed");

        const keys = r.jobs.flatMap((j) => j.quotes.map((q) => dedupeKeyForQuote(q.id, r.customer.id)));
        await prisma.notification.updateMany({
          where: { dedupeKey: { in: keys }, emailStatus: "PENDING" },
          data: { emailStatus: "SENT", emailSentAt: new Date(), emailAttempts: { increment: 1 } },
        });
      })
    );
    for (const x of results) {
      if (x.status === "fulfilled") result.emailsSent += 1;
      else result.emailsFailed += 1;
    }
  }

  log(`Done. ${result.emailsSent} email(s) sent, ${result.emailsFailed} failed.`);
  return result;
}
