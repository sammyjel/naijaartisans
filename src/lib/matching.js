// Job -> artisan matching rules.
//
// Kept in its own module with NO database import so the rules can be unit-tested
// directly (tests/matching.test.mjs). They are the part of the notification
// system most likely to be changed by accident, and the part where a mistake is
// invisible: over-matching looks like spam, under-matching looks like silence,
// and neither raises an error.

/**
 * Upper bound on artisans notified per job. Not a performance guard so much as a
 * trust one: blasting all 60 artisans for a Lagos tiling job trains them to
 * ignore our emails, and an ignored notification is worth the same as none.
 */
export const MAX_ARTISANS_PER_JOB = 15;

/**
 * If a job's own city yields fewer than this many artisans, top up with
 * same-trade artisans elsewhere so a customer in an underserved city still gets
 * quotes. Those recipients are told the job is outside their city.
 */
export const CITY_FLOOR = 3;

/** How many out-of-city artisans the top-up may add. */
export const OUT_OF_CITY_CAP = 5;

/** The idempotency key for a job-match notification. Pure, so it can be asserted on. */
export function dedupeKeyForJobMatch(jobId, artisanId) {
  return "job:" + jobId + ":artisan:" + artisanId;
}

/** The idempotency key for the "you have a new quote" notification to a customer. */
export function dedupeKeyForQuote(quoteId, customerId) {
  return "quote:" + quoteId + ":customer:" + customerId;
}

const isActive = (until) => Boolean(until && new Date(until).getTime() > Date.now());

/**
 * Ranks and selects artisans for a job from an already-fetched candidate list.
 *
 * Order: same city first, then paid standing (featured/pro), then longest-standing
 * account as a stable tie-break.
 *
 * @param {Array<{id:string,name:string,email:string|null,city:string|null,featuredUntil?:Date|string|null,proUntil?:Date|string|null,createdAt:Date|string}>} candidates
 * @param {{ city: string, limit?: number }} opts
 * @returns {Array<{id:string,name:string,email:string|null,city:string|null,sameCity:boolean}>}
 */
export function rankArtisansForJob(candidates, { city, limit = MAX_ARTISANS_PER_JOB } = {}) {
  const rankKey = (a) => [
    isActive(a.featuredUntil) || isActive(a.proUntil) ? 0 : 1,
    new Date(a.createdAt).getTime(),
  ];
  const byRank = (a, b) => {
    const [pa, ca] = rankKey(a);
    const [pb, cb] = rankKey(b);
    return pa !== pb ? pa - pb : ca - cb;
  };

  const inCity = candidates.filter((a) => a.city && city && a.city === city).sort(byRank);
  const elsewhere = candidates.filter((a) => !(a.city && city && a.city === city)).sort(byRank);

  const picked = inCity.slice(0, limit).map((a) => ({ ...a, sameCity: true }));

  // Underserved city: top up rather than leave the customer with silence. Without
  // this, a customer in a city with no registered artisan of that trade gets
  // nothing at all — the exact failure this release exists to fix.
  if (picked.length < CITY_FLOOR) {
    const room = Math.min(OUT_OF_CITY_CAP, limit - picked.length);
    picked.push(...elsewhere.slice(0, room).map((a) => ({ ...a, sameCity: false })));
  }

  return picked.map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    city: a.city,
    sameCity: a.sameCity,
  }));
}
