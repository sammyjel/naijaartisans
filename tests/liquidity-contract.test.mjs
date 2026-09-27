// Contract tests for the liquidity work.
//
// The behaviours below are guaranteed by the DATABASE (unique indexes) and by the
// ORDER of operations in the route handlers. Proving them end to end needs a live
// Postgres, which this environment does not have — the project's DATABASE_URL is
// intentionally unavailable locally. So these assert the invariants at the level
// they are actually expressed: the schema and the source.
//
// They are not a substitute for the end-to-end run in docs/VERIFICATION.md. They
// exist because every one of them is a silent failure mode — a dropped
// skipDuplicates sends 15 duplicate emails, and a notification moved above the
// create() sends artisans to a job that does not exist. Neither throws.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const src = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const schema = src("prisma/schema.prisma");
const jobsRoute = src("src/app/api/jobs/route.js");
const quotesRoute = src("src/app/api/jobs/[id]/quotes/route.js");
const reviewsRoute = src("src/app/api/reviews/route.js");
const notificationsLib = src("src/lib/notifications.js");
const reviewsLib = src("src/lib/reviews.js");
const demoSeed = src("prisma/seed-demo.mjs");

// ── notifications: idempotency ─────────────────────────────────────────────

test("job-match notifications are inserted with skipDuplicates", () => {
  // Together with the unique dedupeKey index, this is the whole idempotency
  // guarantee: a retried POST /api/jobs inserts nothing and emails nobody twice.
  assert.match(notificationsLib, /createMany\(\{[\s\S]*?skipDuplicates:\s*true/);
});

test("Notification.dedupeKey is unique in the schema", () => {
  const model = schema.slice(
    schema.indexOf("model Notification {"),
    schema.indexOf("}", schema.indexOf("@@index([emailStatus"))
  );
  assert.match(model, /dedupeKey\s+String\s+@unique/, "without @unique, skipDuplicates does nothing");
});

test("only notifications still owed an email are emailed", () => {
  // This is what makes a retry safe end to end rather than just at insert time.
  assert.match(
    notificationsLib,
    /emailStatus:\s*"PENDING"/,
    "the send step must select on PENDING so SENT rows are never re-sent"
  );
});

test("email delivery status is recorded per notification", () => {
  for (const status of ["SENT", "FAILED", "SKIPPED"]) {
    assert.ok(
      notificationsLib.includes(`"${status}"`),
      `expected the ${status} delivery state to be recorded`
    );
  }
  assert.match(notificationsLib, /emailAttempts/, "attempts must be counted for retry limits");
  assert.match(notificationsLib, /emailError/, "failures must record why");
});

test("a retry path exists and is bounded by an attempt limit", () => {
  assert.match(notificationsLib, /export async function retryPendingNotificationEmails/);
  assert.match(notificationsLib, /maxAttempts/, "retries must not loop forever");
});

// ── notifications: ordering ────────────────────────────────────────────────

test("notification happens AFTER the job is created", () => {
  const createAt = jobsRoute.indexOf("prisma.jobRequest.create");
  const notifyAt = jobsRoute.indexOf("notifyArtisansOfJob(job)");
  assert.ok(createAt > -1, "expected the job create call");
  assert.ok(notifyAt > -1, "expected the notify call");
  assert.ok(
    createAt < notifyAt,
    "notifying before the job is persisted would send artisans to a 404"
  );
});

test("notification is awaited, not fire-and-forget", () => {
  // On Vercel, work left running after the response can be killed when the
  // function suspends, which would silently drop the emails.
  assert.match(jobsRoute, /await notifyArtisansOfJob\(job\)/);
});

test("notification is not inside a database transaction", () => {
  const notifyAt = jobsRoute.indexOf("notifyArtisansOfJob");
  const txAt = jobsRoute.indexOf("$transaction");
  assert.ok(
    txAt === -1 || notifyAt > txAt,
    "sending email inside a transaction holds a connection open for the whole fan-out"
  );
});

test("the job POST reports how many artisans were really notified", () => {
  // Phase 12: the confirmation must not promise notifications that never existed.
  assert.match(jobsRoute, /notified:\s*\{/);
  assert.match(jobsRoute, /artisans:\s*delivery\.created/);
});

test("a quote notifies the customer after the quote is saved", () => {
  const createAt = quotesRoute.indexOf("prisma.quote.create");
  // The call site, not the import at the top of the file.
  const notifyAt = quotesRoute.indexOf("notifyCustomerOfQuote(quote");
  assert.ok(createAt > -1, "expected the quote create call");
  assert.ok(notifyAt > -1, "expected the notify call site");
  assert.ok(createAt < notifyAt, "notify only once the quote exists");
});

test("notification helpers never throw into their callers", () => {
  // A saved job must not 500 because an email bounced.
  const exported = notificationsLib.match(/export async function (notifyArtisansOfJob|notifyCustomerOfQuote)[\s\S]*?\n}/g) || [];
  assert.equal(exported.length, 2, "expected both notify functions");
  for (const fn of exported) {
    assert.match(fn, /try\s*\{/, "each notify function should wrap its body in try/catch");
    assert.match(fn, /catch/);
  }
});

// ── reviews ────────────────────────────────────────────────────────────────

test("a review requires eligibility before it is created", () => {
  const checkAt = reviewsRoute.indexOf("checkReviewEligibility");
  const createAt = reviewsRoute.indexOf("createReview");
  assert.ok(checkAt > -1, "expected the eligibility check");
  assert.ok(createAt > -1, "expected the create call");
  assert.ok(checkAt < createAt, "eligibility must be checked before the review is written");
});

test("eligibility is tied to a job the artisan actually quoted on", () => {
  assert.match(
    reviewsLib,
    /quotes:\s*\{\s*some:\s*\{\s*artisanId:\s*targetId/,
    "a review should require real contact, not just a logged-in account"
  );
});

test("duplicate reviews are prevented by a unique index, not only by a check", () => {
  const model = schema.slice(schema.indexOf("model Review {"), schema.indexOf("model Notification {"));
  assert.match(model, /@@unique\(\[authorId,\s*targetId\]\)/);
});

test("the route still handles the unique-violation race", () => {
  assert.match(reviewsRoute, /P2002/, "two simultaneous submissions must not produce a 500");
});

test("a review and its aggregate are written in one transaction", () => {
  // Otherwise a review can exist while /browse still says "New artisan".
  assert.match(reviewsLib, /\$transaction/);
});

test("aggregates count genuine reviews only", () => {
  const occurrences = (reviewsLib.match(/isDemo:\s*false/g) || []).length;
  assert.ok(
    occurrences >= 2,
    "every aggregate query must exclude demo rows, or seeded data could inflate a real rating"
  );
});

test("the review link to its job is nullable and does not cascade-delete history", () => {
  const model = schema.slice(schema.indexOf("model Review {"), schema.indexOf("model Notification {"));
  assert.match(model, /jobRequestId\s+String\?/, "older reviews have no job to point at");
  assert.match(model, /onDelete:\s*SetNull/, "deleting a job must not erase an artisan's record");
});

// ── demo data safety ───────────────────────────────────────────────────────

test("the demo seed refuses to run against a non-local database by default", () => {
  assert.match(demoSeed, /SEED_DEMO_CONFIRM/);
  assert.match(demoSeed, /REFUSING TO SEED/);
  assert.match(demoSeed, /process\.exit\(1\)/);
});

test("every demo review is flagged isDemo", () => {
  assert.match(demoSeed, /isDemo:\s*true/);
  assert.equal(
    /isDemo:\s*false/.test(demoSeed),
    false,
    "the demo seed must never write a review that claims to be genuine"
  );
});

test("demo rows are identifiable by name and by an unroutable email domain", () => {
  assert.match(demoSeed, /\[DEMO\]/);
  assert.match(demoSeed, /demo\.invalid/);
});

test("the demo seed only reviews artisans it created itself", () => {
  // Attaching invented reviews to the 60 real artisans would be fabricating
  // feedback about identifiable people.
  assert.match(demoSeed, /NO REAL ARTISAN EVER RECEIVES A SEEDED REVIEW/);
  assert.equal(
    /role:\s*"ARTISAN"\s*\}\s*\)\s*;?\s*$/m.test(demoSeed) && !demoSeed.includes("demoEmail"),
    false,
    "demo reviews must target demo-created artisans only"
  );
});

test("the UI can label a demo review as a sample", () => {
  const browse = src("src/app/browse/page.js");
  assert.match(browse, /isDemo/, "browse must be able to see the flag");
  assert.match(browse, /Sample/, "and render a label rather than passing it off as genuine");
});

// ── observability ──────────────────────────────────────────────────────────

test("the funnel events needed to diagnose zero-quote jobs are emitted", () => {
  const metrics = src("src/lib/metrics.js");
  for (const event of [
    "job_posted",
    "job_match_evaluated",
    "notifications_created",
    "notification_email",
    "quote_submitted",
    "review_submitted",
  ]) {
    assert.ok(metrics.includes(event), `missing funnel event: ${event}`);
  }
  assert.match(metrics, /job_zero_match/, "a job that reached nobody must be loggable");
});

test("funnel logging records no customer contact details", () => {
  const metrics = src("src/lib/metrics.js");
  const body = metrics.slice(metrics.indexOf("export function track"));
  for (const field of ["email", "phone", "password"]) {
    assert.equal(
      new RegExp("\\b" + field + ":").test(body),
      false,
      `funnel logs must not carry ${field}`
    );
  }
});

test("zero-match jobs are logged loudly enough to alert on", () => {
  assert.match(src("src/lib/metrics.js"), /console\.warn/);
});
