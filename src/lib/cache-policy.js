// How long data may be served from cache, and what busts it.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
//
// On 2026-10-01 the database stopped answering: "your account or project has
// exceeded the quota". /browse and /jobs returned 500 while the ISR-cached pages
// kept serving, which hid the outage behind a healthy-looking homepage.
//
// The cause was not traffic volume — this site has 59 users. It was the SHAPE of
// the database access:
//
//   141 ISR pages on revalidate = 3600, each re-querying independently
//   4 force-dynamic pages hitting the database on EVERY request, crawlers included
//
// Neon's free tier suspends the compute after 5 idle minutes and bills by the
// hour it is awake (191.9/month, about 6.4 a day). A trickle of requests spread
// across 141 pages means it never gets 5 quiet minutes, so it bills 24 hours a
// day. Being crawled well — 174 indexed URLs — was what exhausted the quota.
//
// So the fix is not fewer features, it is fewer WAKE-UPS: cache for a day rather
// than an hour, and bust precisely when something actually changes.
//
// No database import here, so the policy can be unit-tested as policy.

/** Cache tags. A write busts only the tags whose data it actually changed. */
export const TAGS = {
  CATEGORIES: "categories",
  SERVICES: "services",
  JOBS: "jobs",
  ARTISANS: "artisans",
};

const HOUR = 3600;
const DAY = 86400;

/**
 * Categories change when the operator adds a trade — a handful of times a year.
 * There is no reason to ask the database hourly.
 */
export const CATEGORIES_TTL = 7 * DAY;

/**
 * Listings change when an artisan joins or edits a service. Those writes bust
 * the tag immediately, so this is only the backstop for a missed bust.
 */
export const LISTINGS_TTL = DAY;

/**
 * The job board is the one place staleness is actually felt: an artisan seeing a
 * day-old board might quote on work already taken. Posting a job busts the tag,
 * so this is a backstop too — but a tighter one.
 */
export const JOBS_TTL = HOUR;

/**
 * Page-level ISR. Was 3600; at 141 pages that is a wake-up every few minutes all
 * day. Writes revalidate on demand, so a day is a backstop, not the update path.
 */
export const PAGE_TTL = DAY;

/**
 * True when a /browse or /jobs request carries no filters.
 *
 * This is the whole caching decision. The unfiltered view is what crawlers and
 * most visitors load, so caching it removes nearly all the database traffic;
 * filtered views stay live because their result space is unbounded and caching
 * them would fill the cache with single-use entries.
 *
 * Treats whitespace as absent — "?q=%20" is not a search.
 *
 * @param {Record<string, string|undefined>} searchParams
 * @param {string[]} [keys] which parameters count as filters
 */
export function isUnfiltered(searchParams, keys = ["category", "city", "q", "lat", "lng"]) {
  if (!searchParams) return true;
  return keys.every((k) => {
    const v = searchParams[k];
    return v === undefined || v === null || String(v).trim() === "";
  });
}

/**
 * The tags a given kind of write invalidates.
 *
 * Mapped explicitly rather than "bust everything on every write": busting all
 * four tags on a review would throw away the cached job board for no reason, and
 * each needless bust is another database wake-up — the exact thing being fixed.
 *
 * @param {"job"|"service"|"artisan"|"review"|"deal"|"category"} event
 * @returns {string[]}
 */
export function tagsForWrite(event) {
  switch (event) {
    case "job":
      return [TAGS.JOBS];
    case "service":
      // A new service appears on /browse and on its artisan's profile.
      return [TAGS.SERVICES, TAGS.ARTISANS];
    case "artisan":
      return [TAGS.ARTISANS, TAGS.SERVICES];
    case "review":
    case "deal":
      // Both move numbers rendered on the browse cards (stars, completed count)
      // as well as on the profile.
      return [TAGS.ARTISANS, TAGS.SERVICES];
    case "category":
      return [TAGS.CATEGORIES, TAGS.SERVICES];
    default:
      return [];
  }
}
