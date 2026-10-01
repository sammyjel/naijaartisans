// Cached readers for the pages that were waking the database on every request.
//
// unstable_cache stores the QUERY RESULT, so /browse and /jobs can stay
// force-dynamic (they must — they read searchParams) while no longer costing a
// round trip to Postgres each time a crawler loads them. See cache-policy.js for
// why that mattered enough to add a layer.
//
// ── A TRAP WORTH KNOWING ───────────────────────────────────────────────────
//
// Cached values are serialised, so Prisma `Date` objects come back as ISO
// STRINGS. Every consumer here already wraps them (`new Date(until)` in
// isFeatured, `new Date(date)` in timeAgo), which is the only reason this is
// safe to drop in. Anything new that does `row.createdAt.getTime()` directly
// will throw only on a cache HIT — fine in development, broken in production.

import { unstable_cache, revalidateTag, revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { TAGS, CATEGORIES_TTL, LISTINGS_TTL, JOBS_TTL, tagsForWrite } from "./cache-policy";

/** Columns /browse needs for an artisan. Kept here so the cached shape is one definition. */
const BROWSE_ARTISAN_SELECT = {
  id: true,
  name: true,
  city: true,
  featuredUntil: true,
  latitude: true,
  longitude: true,
  avatarUrl: true,
  ratingAverage: true,
  reviewCount: true,
  completedDealCount: true,
};

/** All categories. Changes a few times a year; cached for a week. */
export const getCachedCategories = unstable_cache(
  async () => prisma.category.findMany({ orderBy: { name: "asc" } }),
  ["categories:all"],
  { revalidate: CATEGORIES_TTL, tags: [TAGS.CATEGORIES] }
);

/**
 * Every service, newest first — the unfiltered /browse listing.
 *
 * Only the unfiltered view is cached. A filtered one is a different query per
 * combination of category/city/q, and caching those would fill the cache with
 * entries used once while doing nothing for the crawler traffic that caused the
 * problem.
 */
export const getCachedServices = unstable_cache(
  async () =>
    prisma.service.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: true, artisan: { select: BROWSE_ARTISAN_SELECT } },
    }),
  ["services:all"],
  { revalidate: LISTINGS_TTL, tags: [TAGS.SERVICES] }
);

/**
 * The job board, unfiltered.
 *
 * Deliberately NOT filtered to status OPEN, because the page does not filter
 * either — it lists every job and greys out the status of the ones that are not
 * open. Matching that exactly keeps this a pure caching change; narrowing it
 * here would quietly alter what the board shows while claiming to fix a quota
 * problem. (Whether the board SHOULD still list filled jobs now that deals exist
 * is a real question, but a separate one.)
 *
 * Shorter TTL than listings: an artisan acting on a day-old board may quote on
 * work already taken, and posting a job busts this tag anyway.
 */
export const getCachedJobBoard = unstable_cache(
  async () =>
    prisma.jobRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        customer: { select: { id: true, name: true, city: true } },
        _count: { select: { quotes: true } },
      },
    }),
  ["jobs:board"],
  { revalidate: JOBS_TTL, tags: [TAGS.JOBS] }
);

/**
 * Busts the cache for what a write actually changed.
 *
 * TAGS and PATHS are different mechanisms and both are needed:
 *
 *   revalidateTag   clears the unstable_cache entries above, which is what
 *                   /browse and /jobs read
 *   revalidatePath  clears a rendered ISR page, which tags do NOT touch
 *
 * Page TTL is now a day, so without the path half a new artisan could sit
 * invisible on /browse for 24 hours. The long TTL is affordable precisely
 * because this runs on every write.
 *
 * Never throws. A job that saved must not 500 because cache invalidation failed;
 * the worst case of a missed bust is data up to one TTL stale, which is exactly
 * what those TTLs are a backstop for.
 *
 * @param {"job"|"service"|"artisan"|"review"|"deal"|"category"} event
 * @param {string[]} [paths] rendered pages this write changes, e.g. ["/browse"]
 */
export function revalidateFor(event, paths = []) {
  try {
    for (const tag of tagsForWrite(event)) revalidateTag(tag);
  } catch (e) {
    console.error("[cache] revalidateTag for " + event + " failed:", e?.message || e);
  }
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (e) {
      console.error("[cache] revalidatePath(" + path + ") failed:", e?.message || e);
    }
  }
}
