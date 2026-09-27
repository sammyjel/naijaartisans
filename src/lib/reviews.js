// Review eligibility and rating aggregates.
//
// Two problems are being fixed here.
//
// 1. ANYONE COULD REVIEW ANYONE. The old POST /api/reviews accepted a review
//    from any logged-in account for any artisan, with no transaction behind it
//    and no duplicate check. On a marketplace that advertises "trusted", that is
//    the one thing that must not be true.
//
//    Eligibility is now: the reviewer must have posted a job that this artisan
//    actually quoted on. That is the cheapest honest proof of contact available
//    in the existing schema - it needs no new "hired" flag and no new flow.
//
// 2. RATINGS WERE RECOMPUTED FROM ALL REVIEWS ON EVERY READ. The artisan profile
//    loaded every review row to average them. /browse renders up to 60 cards, so
//    doing the same there would have been 60 extra aggregate queries. The average
//    and count now live on User and are recomputed on write.
//
// Demo reviews (Review.isDemo) are excluded from the aggregates everywhere in
// this file. A seeded staging database must never produce a public star rating.

import { prisma } from "./prisma";
import { track } from "./metrics";
import { toStoredAggregate } from "./rating";

// Re-exported so the aggregate rule has one import site for callers, while the
// arithmetic itself lives in a database-free module that tests can import.
export { toStoredAggregate };

/**
 * Recomputes and stores ratingAverage / reviewCount for one artisan from their
 * GENUINE reviews. Called after any review write.
 *
 * Returns the stored values so a caller can respond with them without re-reading.
 *
 * @param {string} targetId
 * @returns {Promise<{ ratingAverage: number|null, reviewCount: number }>}
 */
export async function recomputeArtisanRating(targetId) {
  const agg = await prisma.review.aggregate({
    where: { targetId, isDemo: false },
    _avg: { rating: true },
    _count: { _all: true },
  });

  const stored = toStoredAggregate(agg._avg.rating, agg._count._all);
  await prisma.user.update({ where: { id: targetId }, data: stored });
  return stored;
}

/**
 * Finds the job that entitles `authorId` to review `targetId`, or null.
 *
 * Eligible means: a job the author posted, on which the target artisan submitted
 * a quote. Closed jobs are preferred (work most likely happened) but an open job
 * with a quote still counts - insisting on a CLOSED job would block almost every
 * genuine review today, since the status is rarely updated.
 *
 * @param {{ authorId: string, targetId: string }} input
 * @returns {Promise<{ id: string, title: string, status: string }|null>}
 */
export async function findReviewableJob({ authorId, targetId }) {
  return prisma.jobRequest.findFirst({
    where: {
      customerId: authorId,
      quotes: { some: { artisanId: targetId } },
    },
    // CLOSED first, then most recent.
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { id: true, title: true, status: true },
  });
}

/**
 * Whether the author may review the target, and why not if they may not.
 *
 * @param {{ authorId: string, targetId: string }} input
 * @returns {Promise<{ ok: true, job: {id:string,title:string,status:string} } | { ok: false, reason: string, status: number }>}
 */
export async function checkReviewEligibility({ authorId, targetId }) {
  if (authorId === targetId) {
    return { ok: false, reason: "You cannot review yourself.", status: 400 };
  }

  const existing = await prisma.review.findUnique({
    where: { authorId_targetId: { authorId, targetId } },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      reason: "You have already reviewed this artisan. Reviews cannot be duplicated.",
      status: 409,
    };
  }

  const job = await findReviewableJob({ authorId, targetId });
  if (!job) {
    return {
      ok: false,
      reason:
        "You can review an artisan after they have quoted on a job you posted. Post a job and request a quote first.",
      status: 403,
    };
  }

  return { ok: true, job };
}

/**
 * Creates a genuine review and refreshes the artisan's aggregates.
 *
 * Both writes go in one transaction: a review that exists while the aggregate
 * still says "New artisan" would be a visible inconsistency on /browse.
 *
 * @param {{ authorId: string, targetId: string, rating: number, comment: string|null, jobRequestId: string|null }} input
 */
export async function createReview({ authorId, targetId, rating, comment, jobRequestId }) {
  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: { authorId, targetId, rating, comment, jobRequestId, isDemo: false },
      include: { author: { select: { id: true, name: true } } },
    });

    const agg = await tx.review.aggregate({
      where: { targetId, isDemo: false },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await tx.user.update({
      where: { id: targetId },
      data: toStoredAggregate(agg._avg.rating, agg._count._all),
    });
    return created;
  });

  track("review_submitted", {
    reviewId: review.id,
    targetId,
    rating,
    fromJob: jobRequestId || null,
  });

  return review;
}

/**
 * One review excerpt per artisan for a set of artisan ids, in ONE query.
 *
 * This exists specifically to keep /browse free of N+1s: the page needs a quote
 * to show on each card, and the obvious implementation is one findFirst per card.
 *
 * Demo reviews are included here but carry isDemo so the card can label them;
 * they are still excluded from the stored aggregates.
 *
 * @param {string[]} artisanIds
 * @param {{ perArtisan?: number }} [opts]
 * @returns {Promise<Map<string, {comment:string,rating:number,authorName:string,isDemo:boolean}>>}
 */
export async function reviewExcerptsByArtisan(artisanIds, opts = {}) {
  const out = new Map();
  const ids = [...new Set(artisanIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const rows = await prisma.review.findMany({
    where: {
      targetId: { in: ids },
      comment: { not: null },
    },
    orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    select: {
      targetId: true,
      comment: true,
      rating: true,
      isDemo: true,
      author: { select: { name: true } },
    },
    // Bounded: enough rows to give most artisans one excerpt without loading the
    // whole review table.
    take: ids.length * (opts.perArtisan ?? 1) + 50,
  });

  for (const r of rows) {
    if (out.has(r.targetId)) continue;
    const comment = String(r.comment || "").trim();
    if (!comment) continue;
    out.set(r.targetId, {
      comment,
      rating: r.rating,
      authorName: (r.author && r.author.name) || "Customer",
      isDemo: r.isDemo,
    });
  }

  return out;
}
