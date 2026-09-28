// Deals: creating them, moving them, and keeping the public completion count
// honest. The rules themselves live in ./deal-rules.js (no database import, so
// they can be unit-tested); this file is the part that touches Postgres.

import { prisma } from "./prisma";
import { track } from "./metrics";
import {
  canTransition,
  jobStatusForDeal,
  COMPLETED,
  CANCELLED,
  AWAITING_CONFIRMATION,
  IN_PROGRESS,
  ACTIVE_STATUSES,
} from "./deal-rules";
import { notifyDealEvent } from "./notifications";

/** Everything a deal card needs, for either side. */
const DEAL_SELECT = {
  id: true,
  status: true,
  title: true,
  agreedPrice: true,
  startedAt: true,
  workDoneAt: true,
  completedAt: true,
  cancelledAt: true,
  cancelledBy: true,
  lastNote: true,
  jobRequestId: true,
  quoteId: true,
  customerId: true,
  artisanId: true,
  customer: { select: { id: true, name: true, phone: true, email: true } },
  artisan: { select: { id: true, name: true, phone: true, email: true, city: true } },
  review: { select: { id: true, rating: true } },
};

/**
 * Recomputes and stores an artisan's confirmed-completion count.
 *
 * Deliberately a recount rather than an increment. An increment is one missed
 * edge case away from a number that can only be corrected by hand, and this is
 * the number the whole feature exists to make trustworthy — it has to be
 * derivable from the deals table at any moment.
 *
 * @param {string} artisanId
 * @param {import("@prisma/client").Prisma.TransactionClient} [tx]
 * @returns {Promise<number>}
 */
export async function recomputeCompletedDeals(artisanId, tx = prisma) {
  const count = await tx.deal.count({ where: { artisanId, status: COMPLETED } });
  await tx.user.update({ where: { id: artisanId }, data: { completedDealCount: count } });
  return count;
}

/**
 * The customer accepts a quote, which starts the deal.
 *
 * Only the job's own customer can do this, so an artisan cannot manufacture a
 * counterparty and then complete work against it.
 *
 * @param {{ quoteId: string, userId: string }} input
 * @returns {Promise<{ok:true, deal:object} | {ok:false, reason:string, status:number}>}
 */
export async function acceptQuote({ quoteId, userId }) {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: {
      jobRequest: { select: { id: true, title: true, customerId: true, status: true } },
      artisan: { select: { id: true, name: true, email: true } },
      deal: { select: { id: true } },
    },
  });

  if (!quote) return { ok: false, reason: "Quote not found.", status: 404 };
  if (!quote.jobRequest) return { ok: false, reason: "That job no longer exists.", status: 404 };
  if (quote.jobRequest.customerId !== userId) {
    return { ok: false, reason: "Only the customer who posted this job can accept a quote.", status: 403 };
  }
  if (quote.deal) {
    return { ok: false, reason: "You have already accepted this quote.", status: 409 };
  }

  // One live deal per job. A customer who wants a different artisan cancels the
  // current deal first — otherwise two artisans both believe they have the work.
  const existingActive = await prisma.deal.findFirst({
    where: { jobRequestId: quote.jobRequest.id, status: { in: ACTIVE_STATUSES } },
    select: { id: true, artisan: { select: { name: true } } },
  });
  if (existingActive) {
    return {
      ok: false,
      reason: `This job already has a deal running with ${existingActive.artisan.name}. Cancel it first if you want to hire someone else.`,
      status: 409,
    };
  }

  const deal = await prisma.$transaction(async (tx) => {
    const created = await tx.deal.create({
      data: {
        jobRequestId: quote.jobRequest.id,
        quoteId: quote.id,
        customerId: userId,
        artisanId: quote.artisanId,
        status: IN_PROGRESS,
        agreedPrice: quote.price ?? null,
        // Copied, not referenced: the deal must still read correctly if the job
        // is edited or deleted later.
        title: quote.jobRequest.title,
      },
      select: DEAL_SELECT,
    });

    // Takes the job off the open board, so it stops being broadcast to artisans
    // who can no longer win it.
    await tx.jobRequest.update({
      where: { id: quote.jobRequest.id },
      data: { status: jobStatusForDeal(IN_PROGRESS) },
    });

    return created;
  });

  track("deal_started", {
    dealId: deal.id,
    jobId: quote.jobRequest.id,
    artisanId: quote.artisanId,
    hasPrice: Boolean(quote.price),
  });

  await notifyDealEvent(deal, "started");

  return { ok: true, deal };
}

/**
 * Applies an action to a deal on behalf of a user.
 *
 * Authorisation is decided by canTransition, which is where the rule that only a
 * customer may reach COMPLETED lives. The count is recomputed inside the same
 * transaction as the status change: a deal that reads COMPLETED while the
 * artisan's badge still says the old number is a visible inconsistency, and on a
 * trust signal it is the kind that gets noticed.
 *
 * @param {{ dealId: string, action: string, userId: string, note?: string }} input
 * @returns {Promise<{ok:true, deal:object} | {ok:false, reason:string, status:number}>}
 */
export async function applyDealAction({ dealId, action, userId, note }) {
  const current = await prisma.deal.findUnique({
    where: { id: dealId },
    select: { id: true, status: true, customerId: true, artisanId: true, jobRequestId: true },
  });
  if (!current) return { ok: false, reason: "Deal not found.", status: 404 };

  const verdict = canTransition(current, action, userId);
  if (!verdict.ok) return verdict;

  const now = new Date();
  const data = { status: verdict.to, lastNote: note ? String(note).slice(0, 500) : null };

  if (verdict.to === AWAITING_CONFIRMATION) data.workDoneAt = now;
  if (verdict.to === COMPLETED) data.completedAt = now;
  if (verdict.to === CANCELLED) {
    data.cancelledAt = now;
    data.cancelledBy = verdict.actorRole;
  }
  // A disputed deal goes back to the artisan; clearing workDoneAt keeps
  // "finished on" honest rather than pointing at an attempt that was rejected.
  if (verdict.to === IN_PROGRESS) data.workDoneAt = null;

  const deal = await prisma.$transaction(async (tx) => {
    const updated = await tx.deal.update({ where: { id: dealId }, data, select: DEAL_SELECT });

    // Recomputed on every transition, not just completion: a cancelled deal that
    // had been completed must also take the number back down.
    await recomputeCompletedDeals(updated.artisanId, tx);

    if (updated.jobRequestId) {
      await tx.jobRequest.update({
        where: { id: updated.jobRequestId },
        data: { status: jobStatusForDeal(verdict.to) },
      });
    }

    return updated;
  });

  track("deal_" + action, {
    dealId: deal.id,
    from: current.status,
    to: verdict.to,
    by: verdict.actorRole,
    artisanId: deal.artisanId,
  });

  await notifyDealEvent(deal, action);

  return { ok: true, deal };
}

/**
 * Every deal a user is party to, newest first, on either side.
 *
 * @param {string} userId
 * @param {{ status?: string }} [opts]
 */
export async function listDealsForUser(userId, opts = {}) {
  return prisma.deal.findMany({
    where: {
      OR: [{ customerId: userId }, { artisanId: userId }],
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 100,
    select: DEAL_SELECT,
  });
}

/** A single deal, only if the caller is party to it. */
export async function getDealForUser(dealId, userId) {
  const deal = await prisma.deal.findUnique({ where: { id: dealId }, select: DEAL_SELECT });
  if (!deal) return null;
  if (deal.customerId !== userId && deal.artisanId !== userId) return null;
  return deal;
}

/**
 * The completed deal that entitles `authorId` to review `targetId`, or null.
 *
 * A review attached to one of these is shown as "Verified job".
 */
export async function findCompletedDeal({ authorId, targetId }) {
  return prisma.deal.findFirst({
    where: { customerId: authorId, artisanId: targetId, status: COMPLETED, review: null },
    orderBy: { completedAt: "desc" },
    select: { id: true, title: true, completedAt: true, jobRequestId: true },
  });
}

/** Counts for an artisan's profile header. */
export async function dealStatsForArtisan(artisanId) {
  const [completed, inProgress] = await Promise.all([
    prisma.deal.count({ where: { artisanId, status: COMPLETED } }),
    prisma.deal.count({ where: { artisanId, status: { in: ACTIVE_STATUSES } } }),
  ]);
  return { completed, inProgress };
}
