// Artisan matching / broadcast rules.
//
// Run with: npm test
//
// These import src/lib/matching.js directly, which has no database import, so the
// rules are tested as rules rather than through a live Postgres. The DB-backed
// paths (createMany idempotency, email status transitions) need a real database
// and are covered by the manual checklist in docs/VERIFICATION.md plus the
// source-invariant tests in liquidity-contract.test.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import {
  rankArtisansForJob,
  relevanceTier,
  dedupeKeyForJobMatch,
  dedupeKeyForQuote,
  MAX_ARTISANS_PER_JOB,
  NOTIFY_SCOPE,
} from "../src/lib/matching.js";

const DAY = 86400000;
const past = new Date(Date.now() - DAY);
const future = new Date(Date.now() + 30 * DAY);

/** Minimal artisan fixture. `matchesTrade` mirrors what the query computes. */
function artisan(id, city, extra = {}) {
  return {
    id,
    name: "Artisan " + id,
    email: id + "@example.test",
    city,
    matchesTrade: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...extra,
  };
}

// ── relevance tiers ────────────────────────────────────────────────────────

test("relevance tiers rank trade+city above everything else", () => {
  assert.equal(relevanceTier({ matchesTrade: true, sameCity: true }), 0);
  assert.equal(relevanceTier({ matchesTrade: true, sameCity: false }), 1);
  assert.equal(relevanceTier({ matchesTrade: false, sameCity: true }), 2);
  assert.equal(relevanceTier({ matchesTrade: false, sameCity: false }), 3);
});

// ── broadcast behaviour ────────────────────────────────────────────────────

test("every artisan is included, not just those matching the trade", () => {
  // This is the whole point of the broadcast: a job must reach all 51 artisans.
  const picked = rankArtisansForJob(
    [
      artisan("plumber-lagos", "Lagos", { matchesTrade: true }),
      artisan("tailor-kano", "Kano"),
      artisan("welder-abuja", "Abuja"),
    ],
    { city: "Lagos" }
  );
  assert.equal(picked.length, 3, "nobody may be filtered out of a broadcast");
});

test("the most relevant artisan is ordered first", () => {
  const picked = rankArtisansForJob(
    [
      artisan("unrelated", "Kano"),
      artisan("same-city-only", "Lagos"),
      artisan("trade-elsewhere", "Abuja", { matchesTrade: true }),
      artisan("trade-and-city", "Lagos", { matchesTrade: true }),
    ],
    { city: "Lagos" }
  );
  assert.deepEqual(
    picked.map((p) => p.id),
    ["trade-and-city", "trade-elsewhere", "same-city-only", "unrelated"]
  );
});

test("each recipient carries the tier the email copy depends on", () => {
  const picked = rankArtisansForJob(
    [artisan("a", "Lagos", { matchesTrade: true }), artisan("b", "Kano")],
    { city: "Lagos" }
  );
  assert.equal(picked[0].tier, 0);
  assert.equal(picked[1].tier, 3);
  // Without these an artisan cannot be told WHY they got an off-trade job.
  assert.equal(picked[0].matchesTrade, true);
  assert.equal(picked[1].matchesTrade, false);
});

test("a job in a city with no artisans still reaches everyone", () => {
  // The original failure: a customer in an underserved city got total silence.
  const picked = rankArtisansForJob(
    [artisan("k1", "Kano"), artisan("a1", "Abuja"), artisan("i1", "Ibadan")],
    { city: "Maiduguri" }
  );
  assert.equal(picked.length, 3);
  assert.ok(picked.every((p) => p.tier === 3));
});

test("an off-trade job still reaches every artisan", () => {
  const picked = rankArtisansForJob(
    [artisan("a", "Lagos"), artisan("b", "Lagos"), artisan("c", "Abuja")],
    { city: "Lagos" }
  );
  assert.equal(picked.length, 3, "nobody matches the trade, but all are alerted");
});

// ── ranking within a tier ──────────────────────────────────────────────────

test("paid artisans rank above unpaid ones within the same tier", () => {
  const picked = rankArtisansForJob(
    [
      artisan("plain", "Lagos", { matchesTrade: true }),
      artisan("featured", "Lagos", { matchesTrade: true, featuredUntil: future }),
      artisan("pro", "Lagos", { matchesTrade: true, proUntil: future }),
    ],
    { city: "Lagos" }
  );
  assert.deepEqual(picked.slice(0, 2).map((p) => p.id).sort(), ["featured", "pro"]);
  assert.equal(picked[2].id, "plain");
});

test("an expired featured badge earns no priority", () => {
  const picked = rankArtisansForJob(
    [
      artisan("expired", "Lagos", { matchesTrade: true, featuredUntil: past }),
      artisan("current", "Lagos", { matchesTrade: true, featuredUntil: future }),
    ],
    { city: "Lagos" }
  );
  assert.equal(picked[0].id, "current");
});

test("longest-standing account is the stable tie-break", () => {
  const picked = rankArtisansForJob(
    [
      artisan("newer", "Lagos", { createdAt: new Date("2026-06-01T00:00:00Z") }),
      artisan("older", "Lagos", { createdAt: new Date("2025-01-01T00:00:00Z") }),
    ],
    { city: "Lagos" }
  );
  assert.equal(picked[0].id, "older");
});

test("a null city never counts as the same city", () => {
  const picked = rankArtisansForJob([artisan("nocity", null)], { city: "Lagos" });
  assert.equal(picked[0].sameCity, false);
  assert.equal(picked[0].tier, 3);
});

// ── safety rails ───────────────────────────────────────────────────────────

test("the cap is high enough to reach the whole current roster", () => {
  // 51 artisans today. The cap exists only to stop a future bulk import turning
  // one job post into thousands of emails inside a single request.
  assert.ok(
    MAX_ARTISANS_PER_JOB >= 100,
    `cap of ${MAX_ARTISANS_PER_JOB} would silently exclude artisans`
  );
  const many = Array.from({ length: 51 }, (_, i) => artisan("a" + i, "Lagos"));
  assert.equal(rankArtisansForJob(many, { city: "Lagos" }).length, 51);
});

test("the cap still truncates an implausibly large roster", () => {
  const huge = Array.from({ length: MAX_ARTISANS_PER_JOB + 50 }, (_, i) => artisan("a" + i, "Lagos"));
  assert.equal(rankArtisansForJob(huge, { city: "Lagos" }).length, MAX_ARTISANS_PER_JOB);
});

test("an explicit lower limit keeps the most relevant recipients", () => {
  const picked = rankArtisansForJob(
    [
      artisan("irrelevant", "Kano"),
      artisan("relevant", "Lagos", { matchesTrade: true }),
      artisan("alsoIrrelevant", "Abuja"),
    ],
    { city: "Lagos", limit: 1 }
  );
  assert.deepEqual(picked.map((p) => p.id), ["relevant"]);
});

test("returns nothing when there are no candidates", () => {
  assert.deepEqual(rankArtisansForJob([], { city: "Lagos" }), []);
});

test("default scope is broadcast to all artisans", () => {
  assert.equal(NOTIFY_SCOPE, "all", "JOB_NOTIFY_SCOPE should default to all");
});

// ── idempotency keys ───────────────────────────────────────────────────────

test("dedupe keys are deterministic and distinct per artisan", () => {
  assert.equal(dedupeKeyForJobMatch("job1", "art1"), "job:job1:artisan:art1");
  assert.equal(dedupeKeyForJobMatch("job1", "art1"), dedupeKeyForJobMatch("job1", "art1"));
  assert.notEqual(dedupeKeyForJobMatch("job1", "art1"), dedupeKeyForJobMatch("job1", "art2"));
  assert.notEqual(dedupeKeyForJobMatch("job1", "art1"), dedupeKeyForJobMatch("job2", "art1"));
});

test("quote dedupe keys cannot collide with job-match keys", () => {
  assert.notEqual(dedupeKeyForQuote("x", "y"), dedupeKeyForJobMatch("x", "y"));
});

test("the same job produces an identical recipient set on a retry", () => {
  const candidates = [
    artisan("a", "Lagos", { matchesTrade: true, featuredUntil: future }),
    artisan("b", "Lagos"),
    artisan("c", "Kano"),
  ];
  assert.deepEqual(
    rankArtisansForJob(candidates, { city: "Lagos" }).map((p) => p.id),
    rankArtisansForJob(candidates, { city: "Lagos" }).map((p) => p.id),
    "matching must be deterministic, or a retry would notify a different set"
  );
});
