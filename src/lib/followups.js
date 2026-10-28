// Automatic follow-up on stalled jobs. Runs daily from Vercel Cron
// (GET /api/cron/followups) and on demand from the admin dashboard.
//
// The rules — which stage, who, when — live in followup-rules.js. This file only
// queries, writes notification rows and sends. It has to run on Vercel: every
// env var there is Sensitive, so no local process can read RESEND_API_KEY.
//
// Idempotency is the notification table's unique dedupeKey, same as the job
// alerts: rows are inserted with skipDuplicates, and only rows still PENDING
// are emailed. A second run the same day sends nothing new; a run that timed
// out mid-send finishes the rest next time.
//
// Cost: ONE query per run over recent OPEN/IN_PROGRESS jobs. Nothing per visit.

import { prisma } from "./prisma";
import { SITE_URL } from "./seo";
import { deliverPending } from "./notifications";
import { notifyOperator } from "./alerts";
import { looksIncompleteNG } from "./phone";
import { decideFollowUps, followUpKey, daysBetween, MAX_AGE_DAYS } from "./followup-rules";

/** Cap per run so one invocation stays well inside the function time limit. */
const MAX_EMAILS_PER_RUN = 40;

const TYPE = {
  no_quotes: "FOLLOWUP_NO_QUOTES",
  pick_quote: "FOLLOWUP_PICK_QUOTE",
  deal_check_in: "FOLLOWUP_DEAL_CHECK_IN",
  confirm_done: "FOLLOWUP_CONFIRM_DONE",
};
// after_job says different things to each side, so it has a type per side.
const AFTER_JOB_TYPE = { customer: "FOLLOWUP_REVIEW_REQUEST", artisan: "FOLLOWUP_JOB_COMPLETED" };
const typeFor = (f) => (f.kind === "after_job" ? AFTER_JOB_TYPE[f.to] : TYPE[f.kind]);

const CTA_BY_TYPE = {
  FOLLOWUP_NO_QUOTES: "Update your job",
  FOLLOWUP_PICK_QUOTE: "Compare quotes",
  FOLLOWUP_DEAL_CHECK_IN: "Open the deal",
  FOLLOWUP_CONFIRM_DONE: "Confirm or reject",
  FOLLOWUP_REVIEW_REQUEST: "Leave a review",
  FOLLOWUP_JOB_COMPLETED: "See your profile",
};

const first = (name) => String(name || "").trim().split(/\s+/)[0] || "they";
const ago = (d, now) => {
  const n = daysBetween(d, now);
  return n === 1 ? "1 day ago" : `${n} days ago`;
};

/** Title, body and link for one follow-up. Plain text; the template escapes it. */
export function followUpMessage(f, job, now = new Date()) {
  const deal = job.deal;
  switch (f.kind) {
    case "no_quotes":
      return {
        title: `No quotes yet on "${job.title}" — is it still needed?`,
        body:
          `You posted this ${ago(job.createdAt, now)} and no artisan has quoted yet. ` +
          "Jobs that say what you will pay and when you want it done get far more replies — add those to your job. " +
          "If you no longer need it, close the job so artisans stop being alerted.",
        url: `/jobs/${job.id}`,
      };
    case "pick_quote":
      return {
        title: `You have ${job.quoteCount} quote${job.quoteCount === 1 ? "" : "s"} on "${job.title}"`,
        body:
          "Compare them and hire the one you prefer — the artisan gets your contact details when you do. " +
          "If none of them suits you, close the job.",
        url: `/jobs/${job.id}`,
      };
    case "deal_check_in":
      if (f.to === "artisan") {
        const phoneWarning = looksIncompleteNG(deal.artisan?.phone)
          ? " IMPORTANT: the phone number on your profile is incomplete, so customers cannot call you. Correct it on your dashboard."
          : "";
        return {
          title: `Have you contacted ${first(job.customer?.name)} about "${job.title}"?`,
          body:
            `${job.customer?.name || "The customer"} hired you ${ago(deal.startedAt, now)}. ` +
            "Call or WhatsApp them to arrange the work — their details are on the deal. " +
            'When the work is finished, tap "Mark as finished" so they can confirm it.' +
            phoneWarning,
          url: `/dashboard#deal-${deal.id}`,
        };
      }
      return {
        title: `Has ${first(deal.artisan?.name)} been in touch about "${job.title}"?`,
        body:
          `You hired ${deal.artisan?.name || "an artisan"} ${ago(deal.startedAt, now)}. ` +
          "If the work is done, confirm it on your dashboard so they get credit. " +
          "If they have not contacted you, you can cancel the deal there and your job reopens for other quotes.",
        url: `/dashboard#deal-${deal.id}`,
      };
    case "confirm_done":
      return {
        title: `Please confirm: is "${job.title}" finished?`,
        body:
          `${deal.artisan?.name || "The artisan"} marked the work as finished ${ago(deal.workDoneAt, now)}. ` +
          "Confirm it if you are satisfied — it counts towards their completed-jobs record — or tell them what is left.",
        url: `/dashboard#deal-${deal.id}`,
      };
    case "after_job":
      if (f.to === "customer") {
        return {
          title: `How did ${first(deal.artisan?.name)} do on "${job.title}"?`,
          body:
            `Thank you for confirming the work is finished. A quick star rating for ${deal.artisan?.name || "your artisan"} ` +
            "takes 30 seconds, helps them win their next job and helps other customers choose well. " +
            "And if you need another job done, post it any time — artisans near you are alerted straight away.",
          url: `/artisans/${deal.artisanId}#reviews`,
        };
      }
      return {
        title: `Well done on "${job.title}" 🎉`,
        body: deal.hasReview
          ? `${job.customer?.name || "Your customer"} confirmed the job and left you a review — it is on your profile now. ` +
            "Share your profile link on WhatsApp and with past customers: reviewed artisans get hired far more often."
          : `${job.customer?.name || "Your customer"} confirmed the job is complete, and it now counts on your profile. ` +
            "Ask them for a quick review while the job is fresh — reviewed artisans get hired far more often. " +
            "Then share your profile link on WhatsApp so your next customer finds you.",
        url: `/artisans/${deal.artisanId}`,
      };
    default:
      return null;
  }
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailHtml({ name, title, body, cta, url }) {
  const href = String(SITE_URL).replace(/\/+$/, "") + url;
  return (
    '<div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:560px">' +
    '<div style="background:#0f4a80;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">' +
    '<div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75">NaijaArtisans</div>' +
    '<div style="font-size:18px;font-weight:800;margin-top:2px">' + esc(title) + "</div></div>" +
    '<div style="border:1px solid #e2e8f0;border-top:0;border-radius:0 0 10px 10px;padding:20px">' +
    '<p style="margin:0 0 14px;color:#334155;font-size:14px;line-height:1.55">Hi ' + esc(name || "there") + ",</p>" +
    '<p style="margin:0 0 18px;color:#334155;font-size:14px;line-height:1.55">' + esc(body) + "</p>" +
    '<p style="margin:0"><a href="' + esc(href) +
    '" style="display:inline-block;background:#0f4a80;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;font-size:14px">' +
    esc(cta) + "</a></p></div></div>"
  );
}

/**
 * Jobs that could need a follow-up, shaped for decideFollowUps.
 *
 * A job with a live or just-completed deal is included whatever its own
 * status: customers close the job the moment they hire (the 2026-10-26 Owerri
 * painting job), and filtering on job status alone silently dropped that deal
 * from every follow-up.
 */
async function loadCandidates(now) {
  const since = new Date(now.getTime() - (MAX_AGE_DAYS + 30) * 86400000);
  const completedSince = new Date(now.getTime() - (MAX_AGE_DAYS + 1) * 86400000);
  const rows = await prisma.jobRequest.findMany({
    where: {
      OR: [
        { status: { in: ["OPEN", "IN_PROGRESS"] }, createdAt: { gte: since } },
        {
          deals: {
            some: {
              OR: [
                { status: { in: ["IN_PROGRESS", "AWAITING_CONFIRMATION"] } },
                { status: "COMPLETED", completedAt: { gte: completedSince } },
              ],
            },
          },
        },
      ],
    },
    select: {
      id: true, title: true, city: true, status: true, createdAt: true, customerId: true,
      customer: { select: { name: true, phone: true } },
      _count: { select: { quotes: true } },
      quotes: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
      deals: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true, status: true, artisanId: true, startedAt: true, workDoneAt: true, completedAt: true,
          artisan: { select: { name: true, phone: true } },
          review: { select: { id: true } },
        },
      },
    },
  });
  return rows.map((j) => {
    const d = j.deals[0];
    return {
      ...j,
      quoteCount: j._count.quotes,
      firstQuoteAt: j.quotes[0]?.createdAt || null,
      deal: d ? { ...d, hasReview: Boolean(d.review) } : null,
    };
  });
}

/**
 * @param {{ send?: boolean, now?: Date }} [opts] without send, reports only.
 */
export async function runFollowUps(opts = {}) {
  const now = opts.now || new Date();
  const send = opts.send === true;
  const jobs = await loadCandidates(now);

  const planned = [];
  for (const job of jobs) {
    for (const f of decideFollowUps(job, now)) {
      const msg = followUpMessage(f, job, now);
      if (msg) planned.push({ ...f, job, ...msg, dedupeKey: followUpKey(f.kind, f.subjectId, f.userId) });
    }
  }

  const keys = planned.map((p) => p.dedupeKey);
  const existing = keys.length
    ? await prisma.notification.findMany({
        where: { dedupeKey: { in: keys } },
        select: { dedupeKey: true, emailStatus: true },
      })
    : [];
  const statusByKey = new Map(existing.map((e) => [e.dedupeKey, e.emailStatus]));

  const report = planned.map((p) => ({
    kind: p.kind,
    to: p.to,
    jobId: p.job.id,
    jobTitle: p.job.title,
    city: p.job.city,
    title: p.title,
    already: statusByKey.get(p.dedupeKey) || null,
  }));

  if (!send) {
    return { dryRun: true, stalled: report.length, wouldSend: report.filter((r) => !r.already || r.already === "PENDING").length, items: report };
  }

  if (planned.length) {
    await prisma.notification.createMany({
      data: planned.map((p) => ({
        userId: p.userId,
        type: typeFor(p),
        title: p.title,
        body: p.body,
        url: p.url,
        jobRequestId: p.job.id,
        dedupeKey: p.dedupeKey,
      })),
      skipDuplicates: true,
    });
  }

  const pending = keys.length
    ? await prisma.notification.findMany({
        where: { dedupeKey: { in: keys }, emailStatus: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: MAX_EMAILS_PER_RUN,
        select: { id: true, type: true, title: true, body: true, url: true, user: { select: { name: true, email: true } } },
      })
    : [];

  const delivery = await deliverPending(pending, (n) =>
    emailHtml({ name: n.user?.name, title: n.title, body: n.body, url: n.url, cta: CTA_BY_TYPE[n.type] || "Open NaijaArtisans" })
  );

  // The owner's daily list of everything stuck, newly nudged or not, with the
  // numbers to ring. A bad phone number is called out because that is a stall
  // no email can fix.
  // after_job is not a stall, so it stays out of the "still stuck" list.
  const stuck = planned.filter((p) => p.kind !== "after_job");
  if (stuck.length) {
    const seen = new Set();
    const rows = [];
    for (const p of stuck) {
      if (seen.has(p.job.id)) continue;
      seen.add(p.job.id);
      const d = p.job.deal;
      const stage =
        p.kind === "no_quotes" ? "No quotes" :
        p.kind === "pick_quote" ? `${p.job.quoteCount} quote(s), nobody hired` :
        p.kind === "deal_check_in" ? `Hired ${ago(d.startedAt, now)}, not marked done` :
        `Done ${ago(d.workDoneAt, now)}, customer has not confirmed`;
      const people = [
        `customer ${p.job.customer?.name || "?"} ${p.job.customer?.phone || "(no phone)"}${looksIncompleteNG(p.job.customer?.phone) ? " ⚠ INCOMPLETE" : ""}`,
        d && (d.status === "IN_PROGRESS" || d.status === "AWAITING_CONFIRMATION")
          ? `artisan ${d.artisan?.name || "?"} ${d.artisan?.phone || "(no phone)"}${looksIncompleteNG(d.artisan?.phone) ? " ⚠ INCOMPLETE" : ""}`
          : null,
      ].filter(Boolean).join(" · ");
      // The label column does not wrap, so keep it short enough for a phone.
      const label = p.job.title.length > 32 ? p.job.title.slice(0, 31) + "…" : p.job.title;
      rows.push([label, `${p.job.city}: ${stage} — ${people}`]);
    }
    await notifyOperator({
      title: `${rows.length} job${rows.length === 1 ? "" : "s"} need${rows.length === 1 ? "s" : ""} a follow-up`,
      intro: `Automatic reminders went out today (${delivery.emailed} emailed). These are still stuck — a call or WhatsApp settles most of them.`,
      rows,
      cta: { label: "Open admin", href: String(SITE_URL).replace(/\/+$/, "") + "/admin" },
    });
  }

  return { dryRun: false, stalled: report.length, ...delivery, items: report };
}
