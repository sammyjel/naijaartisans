// Rating aggregate arithmetic.
//
// One rule, defined once, in a module with no database import so it can be
// unit-tested: an artisan with no reviews stores NULL, never 0.
//
// That distinction is the whole reason this file exists. "Not rated yet" and
// "rated zero out of five" are different claims about a real person's work, and
// /browse has to be able to tell them apart to render "New · no reviews yet"
// instead of an insulting 0.0.

/**
 * @param {number|null|undefined} avg raw average from the database
 * @param {number} count number of GENUINE reviews counted
 * @returns {{ ratingAverage: number|null, reviewCount: number }}
 */
export function toStoredAggregate(avg, count) {
  const reviewCount = Number(count) || 0;
  const ratingAverage =
    reviewCount > 0 && avg != null ? Math.round(Number(avg) * 100) / 100 : null;
  return { ratingAverage, reviewCount };
}
