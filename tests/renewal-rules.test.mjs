// Monthly plans: who is reminded to renew, and when.

import test from "node:test";
import assert from "node:assert/strict";
import { decideRenewals, renewalKey, REMIND_BEFORE_DAYS, EXPIRED_GRACE_DAYS } from "../src/lib/renewal-rules.js";
import { PLANS } from "../src/lib/monetization.js";

const NOW = new Date("2026-10-28T08:00:00.000Z");
const inDays = (n) => new Date(NOW.getTime() + n * 86400000);

test("both plans last a month", () => {
  for (const p of PLANS) assert.equal(p.days, 30, p.id);
  assert.deepEqual(PLANS.map((p) => p.period), ["per month", "per month"]);
});

test("no reminder while the plan has more than 3 days left", () => {
  assert.deepEqual(decideRenewals({ id: "u", featuredUntil: inDays(REMIND_BEFORE_DAYS + 1) }, NOW), []);
});

test("reminds in the last 3 days", () => {
  const [r] = decideRenewals({ id: "u", featuredUntil: inDays(2) }, NOW);
  assert.equal(r.stage, "expiring");
  assert.equal(r.plan, "featured");
  assert.equal(r.daysLeft, 2);
});

test("one last nudge just after it ends, then silence", () => {
  assert.equal(decideRenewals({ id: "u", proUntil: inDays(-1) }, NOW)[0].stage, "expired");
  assert.deepEqual(decideRenewals({ id: "u", proUntil: inDays(-(EXPIRED_GRACE_DAYS + 1)) }, NOW), []);
});

test("no Featured reminder while Pro (which includes it) is still running", () => {
  const r = decideRenewals({ id: "u", featuredUntil: inDays(1), proUntil: inDays(20) }, NOW);
  assert.deepEqual(r, []);
});

test("renewing moves the expiry, so next month's reminder has a new key", () => {
  assert.notEqual(renewalKey("expiring", "pro", "u", inDays(2)), renewalKey("expiring", "pro", "u", inDays(32)));
  assert.equal(renewalKey("expiring", "pro", "u", inDays(2)), renewalKey("expiring", "pro", "u", inDays(2)));
});

test("never-paid members get nothing", () => {
  assert.deepEqual(decideRenewals({ id: "u", featuredUntil: null, proUntil: null }, NOW), []);
});
