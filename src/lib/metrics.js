// Funnel instrumentation.
//
// The business problem this release exists to fix is liquidity, not page speed:
// 60 artisans produced 9 jobs and 4 quotes, and 5 of those 9 jobs got no quote
// at all. None of that was measurable from inside the app — the only analytics
// wired up is @vercel/analytics, which runs in the browser and therefore cannot
// see a job post that failed to reach anyone.
//
// So the funnel is emitted server-side as single-line JSON to stdout. On Vercel
// that lands in runtime logs and is queryable without adding an analytics
// vendor, which the brief explicitly rules out. If a log drain is added later,
// these lines are already structured for it.
//
// Deliberately NOT logged: emails, phone numbers, names, job descriptions. Ids
// and counts are enough to answer every funnel question and keep customer
// contact details out of a log aggregator.

/** @typedef {"job_posted"|"job_match_evaluated"|"notifications_created"|"notification_email"|"job_viewed_by_artisan"|"quote_submitted"|"review_submitted"} FunnelEvent */

const PREFIX = "[funnel]";

/**
 * Emits one structured funnel event. Never throws: a logging failure must not
 * take down a job post.
 *
 * @param {FunnelEvent} event
 * @param {Record<string, string|number|boolean|null|undefined>} [fields]
 */
export function track(event, fields = {}) {
  try {
    const clean = {};
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) clean[k] = v;
    }
    console.log(`${PREFIX} ${JSON.stringify({ event, at: new Date().toISOString(), ...clean })}`);
  } catch {
    // Logging is never worth an exception.
  }
}

/**
 * The one metric that matters most: a job that reached nobody. Logged at WARN
 * so it can be alerted on, because it is invisible to the customer — their job
 * looks posted either way.
 *
 * @param {{ jobId: string, categoryId: string, city: string }} job
 */
export function trackZeroMatch(job) {
  try {
    console.warn(
      `${PREFIX} ${JSON.stringify({
        event: "job_zero_match",
        at: new Date().toISOString(),
        severity: "warn",
        jobId: job.jobId,
        categoryId: job.categoryId,
        city: job.city,
      })}`
    );
  } catch {
    /* ignore */
  }
}
