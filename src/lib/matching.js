// Job -> artisan matching rules.
//
// Kept in its own module with NO database import so the rules can be unit-tested
// directly (tests/matching.test.mjs). They are the part of the notification
// system most likely to be changed by accident, and the part where a mistake is
// invisible: over-matching looks like spam, under-matching looks like silence,
// and neither raises an error.

/**
 * Who hears about a new job.
 *
 *   "all"      every registered artisan, whatever their trade or city (default)
 *   "matched"  only artisans who list a service in the job's category
 *
 * Set JOB_NOTIFY_SCOPE=matched to narrow it without a code change.
 *
 * "all" is the deliberate choice while the marketplace is small: with 51
 * artisans and 9 jobs ever, the cost of a plumber seeing a tailoring job is
 * lower than the cost of a customer getting no quote. That trade reverses as
 * volume grows — when artisans start ignoring the emails, switch to "matched".
 * Ranking below is what makes that switch cheap: the ordering is already right.
 */
export const NOTIFY_SCOPE =
  (process.env.JOB_NOTIFY_SCOPE || "all").toLowerCase() === "matched" ? "matched" : "all";

/**
 * Hard ceiling on recipients per job. Well above the current 51 artisans, so in
 * practice everyone is notified; it exists so a future import of 5,000 accounts
 * cannot turn one job post into 5,000 emails inside a single request.
 */
export const MAX_ARTISANS_PER_JOB = Number(process.env.JOB_NOTIFY_MAX || 300);

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
 * Relevance tier, lowest first. Drives both ordering and the wording of the
 * email, so an artisan is always told WHY they received a job.
 *
 *   0  their trade, their city      "matches your trade, in your city"
 *   1  their trade, another city    "matches your trade, outside your city"
 *   2  another trade, their city    "in your city"
 *   3  another trade, another city  plainly marked as a general alert
 */
export function relevanceTier({ matchesTrade, sameCity }) {
  if (matchesTrade && sameCity) return 0;
  if (matchesTrade) return 1;
  if (sameCity) return 2;
  return 3;
}

/**
 * Ranks artisans for a job from an already-fetched candidate list.
 *
 * Order: relevance tier -> paid standing (featured/pro) -> longest-standing
 * account as a stable tie-break. Determinism matters: a retried job post must
 * produce the same recipient set, or the dedupe keys stop lining up.
 *
 * @param {Array<{id:string,name:string,email:string|null,city:string|null,matchesTrade?:boolean,featuredUntil?:Date|string|null,proUntil?:Date|string|null,createdAt:Date|string}>} candidates
 * @param {{ city: string, limit?: number }} opts
 * @returns {Array<{id:string,name:string,email:string|null,city:string|null,matchesTrade:boolean,sameCity:boolean,tier:number}>}
 */
export function rankArtisansForJob(candidates, { city, limit = MAX_ARTISANS_PER_JOB } = {}) {
  const annotated = candidates.map((a) => {
    const sameCity = Boolean(a.city && city && a.city === city);
    const matchesTrade = Boolean(a.matchesTrade);
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      city: a.city,
      matchesTrade,
      sameCity,
      tier: relevanceTier({ matchesTrade, sameCity }),
      _paid: isActive(a.featuredUntil) || isActive(a.proUntil) ? 0 : 1,
      _age: new Date(a.createdAt).getTime(),
    };
  });

  annotated.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a._paid !== b._paid) return a._paid - b._paid;
    return a._age - b._age;
  });

  return annotated.slice(0, limit).map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    city: a.city,
    matchesTrade: a.matchesTrade,
    sameCity: a.sameCity,
    tier: a.tier,
  }));
}
