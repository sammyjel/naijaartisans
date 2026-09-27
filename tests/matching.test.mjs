// Artisan matching rules.
//
// Run with: npm test
//
// These import src/lib/matching.js directly, which has no database import, so the
// rules are tested as rules rather than through a live Postgres. The DB-backed
// paths (createMany idempotency, email status transitions) need a real database
// and are covered by the manual checklist in docs/VERIFICATION.md plus the
// source-invariant tests in notifications-contract.test.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import {
  rankArtisansForJob,
  dedupeKeyForJobMatch,
  dedupeKeyForQuote,
  MAX_ARTISANS_PER_JOB,
  CITY_FLOOR,
  OUT_OF_CITY_CAP,
} from "../src/lib/matching.js";

const DAY = 86400000;
const past = new Date(Date.now() - DAY);
const future = new Date(Date.now() + 30 * DAY);

/** Minimal artisan fixture. */
function artisan(id, city, extra = {}) {
  return {
    id,
    name: "Artisan " + id,
    email: id + "@example.test",
    city,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...extra,
  };
}

test("prefers artisans in the job's city", () => {
  const picked = rankArtisansForJob(
    [artisan("far1", "Kano"), artisan("near1", "Lagos"), artisan("far2", "Abuja")],
    { city: "Lagos" }
  );
  // Only one is in Lagos, and CITY_FLOOR forces a top-up, so the Lagos one must
  // still come first and be flagged sameCity.
  assert.equal(picked[0].id, "near1");
  assert.equal(picked[0].sameCity, true);
});

test("marks out-of-city top-ups as sameCity: false", () => {
  const picked = rankArtisansForJob([artisan("near1", "Lagos"), artisan("far1", "Kano")], {
    city: "Lagos",
  });
  const far = picked.find((p) => p.id === "far1");
  assert.ok(far, "expected the out-of-city artisan to be topped up");
  assert.equal(far.sameCity, false, "out-of-city recipients must be flagged so the email can say so");
});

test("ranks featured and pro artisans above unpaid ones in the same city", () => {
  const picked = rankArtisansForJob(
    [
      artisan("plain", "Lagos"),
      artisan("featured", "Lagos", { featuredUntil: future }),
      artisan("pro", "Lagos", { proUntil: future }),
    ],
    { city: "Lagos" }
  );
  assert.deepEqual(
    picked.slice(0, 2).map((p) => p.id).sort(),
    ["featured", "pro"],
    "paid artisans should occupy the first two slots"
  );
  assert.equal(picked[2].id, "plain");
});

test("an expired featured badge does not earn priority", () => {
  const picked = rankArtisansForJob(
    [artisan("expired", "Lagos", { featuredUntil: past }), artisan("current", "Lagos", { featuredUntil: future })],
    { city: "Lagos" }
  );
  assert.equal(picked[0].id, "current");
});

test("uses longest-standing account as a stable tie-break", () => {
  const picked = rankArtisansForJob(
    [
      artisan("newer", "Lagos", { createdAt: new Date("2026-06-01T00:00:00Z") }),
      artisan("older", "Lagos", { createdAt: new Date("2025-01-01T00:00:00Z") }),
    ],
    { city: "Lagos" }
  );
  assert.equal(picked[0].id, "older");
});

test("never notifies more than the cap, however many qualify", () => {
  const many = Array.from({ length: 60 }, (_, i) => artisan("a" + i, "Lagos"));
  const picked = rankArtisansForJob(many, { city: "Lagos" });
  assert.equal(picked.length, MAX_ARTISANS_PER_JOB);
  assert.ok(MAX_ARTISANS_PER_JOB < 60, "the cap must actually be a cap");
});

test("respects an explicit lower limit", () => {
  const many = Array.from({ length: 20 }, (_, i) => artisan("a" + i, "Lagos"));
  assert.equal(rankArtisansForJob(many, { city: "Lagos", limit: 4 }).length, 4);
});

test("does not top up when the city already meets the floor", () => {
  const picked = rankArtisansForJob(
    [
      artisan("l1", "Lagos"),
      artisan("l2", "Lagos"),
      artisan("l3", "Lagos"),
      artisan("k1", "Kano"),
    ],
    { city: "Lagos" }
  );
  assert.equal(picked.length, 3, "three in-city artisans meet CITY_FLOOR, so no top-up");
  assert.ok(
    picked.every((p) => p.sameCity),
    "nobody outside the city should be notified when the floor is met"
  );
});

test("an underserved city still produces recipients (the zero-quote failure)", () => {
  // No artisan in the job's city at all. The customer must not get silence.
  const picked = rankArtisansForJob(
    [artisan("k1", "Kano"), artisan("a1", "Abuja"), artisan("i1", "Ibadan")],
    { city: "Maiduguri" }
  );
  assert.ok(picked.length > 0, "a city with no local artisan must still notify someone");
  assert.ok(picked.length <= OUT_OF_CITY_CAP);
  assert.ok(picked.every((p) => p.sameCity === false));
});

test("returns nothing when there are no candidates", () => {
  assert.deepEqual(rankArtisansForJob([], { city: "Lagos" }), []);
});

test("treats a null city on either side as not-a-match rather than a match", () => {
  const picked = rankArtisansForJob([artisan("nocity", null)], { city: "Lagos" });
  assert.equal(picked.length, 1, "still eligible via the top-up");
  assert.equal(picked[0].sameCity, false, "a null city must never count as the same city");
});

test("dedupe keys are deterministic and distinct per artisan", () => {
  assert.equal(dedupeKeyForJobMatch("job1", "art1"), "job:job1:artisan:art1");
  assert.equal(
    dedupeKeyForJobMatch("job1", "art1"),
    dedupeKeyForJobMatch("job1", "art1"),
    "same inputs must give the same key - this is what makes a retried POST a no-op"
  );
  assert.notEqual(dedupeKeyForJobMatch("job1", "art1"), dedupeKeyForJobMatch("job1", "art2"));
  assert.notEqual(dedupeKeyForJobMatch("job1", "art1"), dedupeKeyForJobMatch("job2", "art1"));
});

test("quote dedupe keys cannot collide with job-match keys", () => {
  assert.notEqual(dedupeKeyForQuote("x", "y"), dedupeKeyForJobMatch("x", "y"));
});

test("the same job produces an identical recipient set on a retry", () => {
  const candidates = [
    artisan("a", "Lagos", { featuredUntil: future }),
    artisan("b", "Lagos"),
    artisan("c", "Kano"),
  ];
  const first = rankArtisansForJob(candidates, { city: "Lagos" });
  const second = rankArtisansForJob(candidates, { city: "Lagos" });
  assert.deepEqual(
    first.map((p) => p.id),
    second.map((p) => p.id),
    "matching must be deterministic, or a retry would notify a different set"
  );
});

test("CITY_FLOOR and OUT_OF_CITY_CAP are sane relative to the cap", () => {
  assert.ok(CITY_FLOOR > 0);
  assert.ok(OUT_OF_CITY_CAP > 0);
  assert.ok(CITY_FLOOR <= MAX_ARTISANS_PER_JOB);
  assert.ok(OUT_OF_CITY_CAP <= MAX_ARTISANS_PER_JOB);
});
