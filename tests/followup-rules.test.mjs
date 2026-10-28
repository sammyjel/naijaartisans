// Which stalled jobs get a follow-up, and who receives it.

import test from "node:test";
import assert from "node:assert/strict";
import {
  decideFollowUps,
  isDue,
  followUpKey,
  FOLLOW_UP_HOURS,
  MAX_AGE_DAYS,
  AFTER_JOB_HOURS,
} from "../src/lib/followup-rules.js";

const NOW = new Date("2026-10-21T08:00:00.000Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);

const job = (over = {}) => ({
  id: "job1",
  status: "OPEN",
  createdAt: daysAgo(3),
  customerId: "cust",
  quoteCount: 0,
  firstQuoteAt: null,
  deal: null,
  ...over,
});

const kinds = (list) => list.map((f) => `${f.kind}->${f.to}`);

test("an open job with no quotes after 36 hours nudges the customer", () => {
  assert.deepEqual(kinds(decideFollowUps(job(), NOW)), ["no_quotes->customer"]);
});

test("nothing is sent while the job is less than 36 hours old", () => {
  assert.deepEqual(decideFollowUps(job({ createdAt: daysAgo(1) }), NOW), []);
});

test("a quoted job nobody hired nudges the customer to pick, timed from the first quote", () => {
  const j = job({ quoteCount: 3, createdAt: daysAgo(5), firstQuoteAt: daysAgo(2) });
  assert.deepEqual(kinds(decideFollowUps(j, NOW)), ["pick_quote->customer"]);
  // A quote that arrived yesterday has not had two days yet.
  assert.deepEqual(decideFollowUps({ ...j, firstQuoteAt: daysAgo(1) }, NOW), []);
});

test("a hired job not marked done asks BOTH sides — the Port Harcourt case", () => {
  // 2026-10-19: hired within an hour, then silence; the artisan's phone was
  // incomplete. Only asking both sides tells no-contact from nobody-clicked.
  const j = job({
    status: "IN_PROGRESS",
    quoteCount: 1,
    deal: { id: "deal1", status: "IN_PROGRESS", artisanId: "art", startedAt: daysAgo(2) },
  });
  const out = decideFollowUps(j, NOW);
  assert.deepEqual(kinds(out), ["deal_check_in->artisan", "deal_check_in->customer"]);
  assert.deepEqual(out.map((f) => f.userId), ["art", "cust"]);
  assert.ok(out.every((f) => f.subjectId === "deal1"), "deal follow-ups are keyed on the deal");
});

test("work marked done but unconfirmed nudges only the customer", () => {
  const j = job({
    status: "IN_PROGRESS",
    deal: { id: "d", status: "AWAITING_CONFIRMATION", artisanId: "art", startedAt: daysAgo(6), workDoneAt: daysAgo(2) },
  });
  assert.deepEqual(kinds(decideFollowUps(j, NOW)), ["confirm_done->customer"]);
});

test("finished, cancelled-and-closed and closed jobs get nothing", () => {
  for (const status of ["COMPLETED", "CLOSED"]) {
    assert.deepEqual(decideFollowUps(job({ status }), NOW), [], status);
  }
  const done = job({
    status: "COMPLETED",
    deal: { id: "d", status: "COMPLETED", artisanId: "a", startedAt: daysAgo(5), workDoneAt: daysAgo(4) },
  });
  assert.deepEqual(decideFollowUps(done, NOW), []);
});

test("a job reopened after a cancelled deal is treated as open again", () => {
  const j = job({
    quoteCount: 2,
    firstQuoteAt: daysAgo(4),
    deal: { id: "d", status: "CANCELLED", artisanId: "a", startedAt: daysAgo(4) },
  });
  assert.deepEqual(kinds(decideFollowUps(j, NOW)), ["pick_quote->customer"]);
});

test("stale history is left alone, so the first run does not spam old jobs", () => {
  assert.deepEqual(decideFollowUps(job({ createdAt: daysAgo(MAX_AGE_DAYS + 1) }), NOW), []);
  assert.equal(isDue(daysAgo(MAX_AGE_DAYS), NOW), true);
  assert.equal(isDue(new Date(NOW - FOLLOW_UP_HOURS * 3600000), NOW), true);
  assert.equal(isDue(new Date(NOW - (FOLLOW_UP_HOURS - 1) * 3600000), NOW), false);
  assert.equal(isDue(null, NOW), false);
});

test("the dedupe key names stage, subject and recipient, so each is nudged once", () => {
  assert.equal(followUpKey("deal_check_in", "deal1", "art"), "followup:deal_check_in:deal1:art");
  assert.notEqual(followUpKey("deal_check_in", "deal1", "art"), followUpKey("deal_check_in", "deal1", "cust"));
});

test("bad input does not throw", () => {
  for (const j of [undefined, null, {}]) assert.deepEqual(decideFollowUps(j, NOW), []);
});

test("a deal started in the evening is caught at the first morning run after 36h", () => {
  // Port Harcourt: hired 2026-10-19 19:13 UTC; the 2026-10-21 08:00 run must ask.
  const startedAt = new Date("2026-10-19T19:13:19.280Z");
  const j = job({ status: "IN_PROGRESS", deal: { id: "d", status: "IN_PROGRESS", artisanId: "a", startedAt } });
  assert.equal(decideFollowUps(j, new Date("2026-10-20T08:00:00Z")).length, 0, "too early on the 20th");
  assert.equal(decideFollowUps(j, new Date("2026-10-21T08:00:00Z")).length, 2, "both sides asked on the 21st");
});
test("a day after the customer confirms, BOTH sides get the after-job follow-up", () => {
  const j = job({
    status: "COMPLETED",
    deal: { id: "d", status: "COMPLETED", artisanId: "art", startedAt: daysAgo(5), workDoneAt: daysAgo(3), completedAt: daysAgo(1) },
  });
  const out = decideFollowUps(j, NOW);
  assert.deepEqual(kinds(out), ["after_job->customer", "after_job->artisan"]);
  assert.deepEqual(out.map((f) => f.userId), ["cust", "art"]);
});

test("the after-job follow-up waits a full day after confirmation", () => {
  const j = job({
    status: "COMPLETED",
    deal: { id: "d", status: "COMPLETED", artisanId: "art", startedAt: daysAgo(3), completedAt: new Date(NOW - (AFTER_JOB_HOURS - 1) * 3600000) },
  });
  assert.deepEqual(decideFollowUps(j, NOW), []);
});

test("a customer who already left a review is not asked again; the artisan still hears", () => {
  const j = job({
    status: "COMPLETED",
    deal: { id: "d", status: "COMPLETED", artisanId: "art", startedAt: daysAgo(5), completedAt: daysAgo(2), hasReview: true },
  });
  assert.deepEqual(kinds(decideFollowUps(j, NOW)), ["after_job->artisan"]);
});

test("a deal on a job the customer CLOSED is still followed up — the Owerri case", () => {
  // 2026-10-26: hired, then the customer closed the job with the deal running.
  const j = job({
    status: "CLOSED",
    deal: { id: "d", status: "IN_PROGRESS", artisanId: "art", startedAt: daysAgo(2) },
  });
  assert.deepEqual(kinds(decideFollowUps(j, NOW)), ["deal_check_in->artisan", "deal_check_in->customer"]);
});
