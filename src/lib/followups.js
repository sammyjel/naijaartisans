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
const KIND_BY_TYPE = Object.fromEntries(Object.entries(TYPE).map(([k, v]) => [v, k]));

const CTA = {
  no_quotes: "Update your job",
  pick_quote: "Compare quotes",
  deal_check_in: "Open the deal",
  confirm_done: "Confirm or reject",
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

function emailHtml({ name, title, body, cta, url }) {
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

/** Recent jobs that could be stalled, shaped for decideFollowUps. */
async function loadCandidates(now) {
  const since = new Date(now.getTime() - (MAX_AGE_DAYS + 30) * 86400000);
  const rows = await prisma.jobRequest.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] }, createdAt: { gte: since } },
    select: {
      id: true, title: true, city: true, status: true, createdAt: true, customerId: true,
      customer: { select: { name: true, phone: true } },
      _count: { select: { quotes: true } },
      quotes: { orderBy: { createdAt: "asc" }, take: 1, select: { createdAt: true } },
      deals: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true, status: true, artisanId: true, startedAt: true, workDoneAt: true,
          artisan: { select: { name: true, phone: true } },
        },
      },
    },
  });
  return rows.map((j) => ({
    ...j,
    quoteCount: j._count.quotes,
    firstQuoteAt: j.quotes[0]?.createdAt || null,
    deal: j.deals[0] || null,
  }));
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
        type: TYPE[p.kind],
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
    emailHtml({ name: n.user?.name, title: n.title, body: n.body, url: n.url, cta: CTA[KIND_BY_TYPE[n.type]] || "Open NaijaArtisans" })
  );

  // The owner's daily list of everything stuck, newly nudged or not, with the
  // numbers to ring. A bad phone number is called out because that is a stall
  // no email can fix.
  if (planned.length) {
    const seen = new Set();
    const rows = [];
    for (const p of planned) {
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
