// Which jobs have stalled, and who should be nudged about it.
//
// DB-free so the rules are testable without a database; src/lib/followups.js
// does the querying and sending and calls decideFollowUps() for every job.
//
// ── WHY THESE FOUR STAGES ──────────────────────────────────────────────────
//
// A job moves posted -> quoted -> hired -> done -> confirmed, and each arrow is
// one person's action. A follow-up goes to whoever owns the next arrow:
//
//   no_quotes      OPEN, no quotes after FOLLOW_UP_HOURS     -> customer
//   pick_quote     OPEN, quoted, nobody hired                -> customer
//   deal_check_in  hired, artisan has not marked it done     -> artisan AND customer
//   confirm_done   artisan says done, customer silent        -> customer
//   after_job      customer confirmed it complete            -> customer AND artisan
//
// after_job is the one that does not chase a stall: a day after the customer
// confirms, the customer is asked for a review (the thing every later customer
// decides on) and the artisan is thanked and told how to turn the job into the
// next one — ask for the review, share the profile. It goes out whatever the
// job's own status, because customers routinely close the job once hired.
//
// deal_check_in goes to BOTH sides because the 2026-10-19 Port Harcourt deal
// stalled exactly there and the cause was invisible from the site: the
// artisan's phone number was incomplete, so the customer could not reach him.
// Only asking both sides tells "no contact" apart from "nobody clicked".
//
// ── ONE NUDGE PER STAGE, AND NOT FOR STALE HISTORY ─────────────────────────
//
// Each (stage, job-or-deal, recipient) is followed up once; the dedupe key makes
// that a database guarantee. And a stage that began more than MAX_AGE_DAYS ago
// is left alone: the first run would otherwise email people about jobs from
// weeks ago, which reads as spam and would be ignored anyway.

// Hours, not whole days, because the job runs once a day at 08:00 UTC. With a
// 2-whole-day rule a deal started at 19:13 waited until the third morning —
// 3.5 days — before anyone was asked. 36h means every stalled stage is caught
// at the first morning run after it has been quiet for a day and a half.
export const FOLLOW_UP_HOURS = 36;
export const MAX_AGE_DAYS = 14;
/** A review is best asked for while the job is fresh: the first run a day after. */
export const AFTER_JOB_HOURS = 24;

const HOUR = 3600000;
const DAY = 86400000;

/** Whole days between two instants, rounded down. */
export function daysBetween(from, to) {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / DAY);
}

/** True when a stage that began at `since` is due a nudge at `now`. */
export function isDue(since, now, hours = FOLLOW_UP_HOURS) {
  if (!since) return false;
  const ms = new Date(now).getTime() - new Date(since).getTime();
  return ms >= hours * HOUR && daysBetween(since, now) <= MAX_AGE_DAYS;
}

export function followUpKey(kind, subjectId, userId) {
  return `followup:${kind}:${subjectId}:${userId}`;
}

/**
 * @param {{
 *   id: string, status: string, createdAt: Date|string,
 *   customerId: string, quoteCount: number, firstQuoteAt?: Date|string|null,
 *   deal?: { id: string, status: string, artisanId: string, startedAt: Date|string, workDoneAt?: Date|string|null, completedAt?: Date|string|null, hasReview?: boolean } | null
 * }} job
 * @param {Date} [now]
 * @returns {Array<{ kind: string, to: "customer"|"artisan", userId: string, subjectId: string, since: Date|string }>}
 */
export function decideFollowUps(job, now = new Date()) {
  if (!job || !job.id) return [];
  const out = [];
  const deal = job.deal || null;
  const active = deal && (deal.status === "IN_PROGRESS" || deal.status === "AWAITING_CONFIRMATION");

  if (job.status === "OPEN" && !active) {
    if (!job.quoteCount) {
      if (isDue(job.createdAt, now)) {
        out.push({ kind: "no_quotes", to: "customer", userId: job.customerId, subjectId: job.id, since: job.createdAt });
      }
    } else if (isDue(job.firstQuoteAt || job.createdAt, now)) {
      out.push({ kind: "pick_quote", to: "customer", userId: job.customerId, subjectId: job.id, since: job.firstQuoteAt || job.createdAt });
    }
    return out;
  }

  if (deal && deal.status === "IN_PROGRESS" && isDue(deal.startedAt, now)) {
    out.push({ kind: "deal_check_in", to: "artisan", userId: deal.artisanId, subjectId: deal.id, since: deal.startedAt });
    out.push({ kind: "deal_check_in", to: "customer", userId: job.customerId, subjectId: deal.id, since: deal.startedAt });
  }

  if (deal && deal.status === "AWAITING_CONFIRMATION" && isDue(deal.workDoneAt, now)) {
    out.push({ kind: "confirm_done", to: "customer", userId: job.customerId, subjectId: deal.id, since: deal.workDoneAt });
  }

  if (deal && deal.status === "COMPLETED" && isDue(deal.completedAt, now, AFTER_JOB_HOURS)) {
    // A customer who already reviewed has nothing left to be asked.
    if (!deal.hasReview) {
      out.push({ kind: "after_job", to: "customer", userId: job.customerId, subjectId: deal.id, since: deal.completedAt });
    }
    out.push({ kind: "after_job", to: "artisan", userId: deal.artisanId, subjectId: deal.id, since: deal.completedAt });
  }

  return out;
}
