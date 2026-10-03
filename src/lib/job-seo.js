// Which job pages may advertise themselves to Google as an open vacancy.
//
// DB-free on purpose, so the rule can be tested without a database and so the
// job page and its generateMetadata cannot drift apart — they were two separate
// inlined conditions before, which is exactly how one gets fixed and the other
// does not.
//
// ── WHY POSTER ROLE IS PART OF THE RULE ────────────────────────────────────
//
// Google's JobPosting guidelines require the markup to describe an actual job
// opening. On 2026-10-03 six of the eight OPEN jobs on this site were artisans
// advertising their own services — "I'm a professional graphics designer",
// "Street wear fashion designer", "Quality Aluminum Roofing" — and every one of
// them was being served to Google as a JobPosting. That is not a stale vacancy,
// it is not a vacancy at all.
//
// The cost of getting this wrong is not limited to the offending page: the Job
// Postings enhancement is assessed against the SITE, so adverts dressed as
// vacancies risk the rich result on the genuine jobs too.
//
// ── WHAT THIS RULE GETS WRONG, AND WHY IT IS STILL THE RIGHT TRADE ─────────
//
// Role is a proxy, not proof. An artisan who genuinely wants to hire another
// artisan posts a real job and loses the rich result under this rule — "Painting
// and screeding" by an ARTISAN account, with two quotes on it, looks exactly
// like such a case. That costs one rich result on one page and nothing else; the
// page still renders, still ranks on its own text, and still takes quotes.
//
// The error in the other direction costs the rich result across every job page.
// So the rule is deliberately conservative, and an explicit admin approval flag
// is the way to let a real artisan-posted job back in when that is worth doing.

export const VACANCY_DAYS = 45;

/** Only a job posted by a customer account is a vacancy worth declaring. */
export const VACANCY_POSTER_ROLE = "CUSTOMER";

export const NOT_OPEN = "not_open";
export const POSTER_IS_NOT_A_CUSTOMER = "poster_is_not_a_customer";
export const ELIGIBLE = "eligible";

/**
 * Decides whether a job page may carry JobPosting markup and stay indexable.
 *
 * Unknown or missing input is treated as NOT eligible. A job whose poster could
 * not be loaded must not be given the benefit of the doubt — silence costs one
 * rich result, a wrong claim risks all of them.
 *
 * @param {{ status?: string, posterRole?: string }} job
 * @returns {{ indexable: boolean, reason: string }}
 */
export function vacancyEligibility(job) {
  const status = job?.status;
  const posterRole = job?.posterRole;

  if (status !== "OPEN") return { indexable: false, reason: NOT_OPEN };
  if (posterRole !== VACANCY_POSTER_ROLE) {
    return { indexable: false, reason: POSTER_IS_NOT_A_CUSTOMER };
  }
  return { indexable: true, reason: ELIGIBLE };
}

/** Convenience wrapper for the common boolean case. */
export function isIndexableVacancy(job) {
  return vacancyEligibility(job).indexable;
}

/**
 * When Google should consider the posting expired even if our status change and
 * its next crawl do not line up.
 */
export function validThrough(createdAt) {
  return new Date(new Date(createdAt).getTime() + VACANCY_DAYS * 86400000).toISOString();
}
