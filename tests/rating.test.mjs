// Rating aggregate arithmetic.
//
// The rule under test: an artisan with no reviews stores NULL, never 0. /browse
// renders "New · no reviews yet" off that null, so a bug here shows up as a real
// person appearing to be rated 0.0 out of 5.

import test from "node:test";
import assert from "node:assert/strict";
import { toStoredAggregate } from "../src/lib/rating.js";

test("no reviews stores null, never zero", () => {
  assert.deepEqual(toStoredAggregate(null, 0), { ratingAverage: null, reviewCount: 0 });
});

test("a zero count with a stray average still stores null", () => {
  // Defensive: if a count of 0 ever arrives alongside an average, the count wins.
  assert.deepEqual(toStoredAggregate(4.5, 0), { ratingAverage: null, reviewCount: 0 });
});

test("a count with a null average stores null rather than NaN", () => {
  assert.deepEqual(toStoredAggregate(null, 3), { ratingAverage: null, reviewCount: 3 });
});

test("averages are rounded to two decimals", () => {
  assert.deepEqual(toStoredAggregate(4.666666666, 3), { ratingAverage: 4.67, reviewCount: 3 });
  assert.deepEqual(toStoredAggregate(3.333333333, 3), { ratingAverage: 3.33, reviewCount: 3 });
});

test("a whole-number average is preserved exactly", () => {
  assert.deepEqual(toStoredAggregate(5, 2), { ratingAverage: 5, reviewCount: 2 });
});

test("computes the expected average for a known set of ratings", () => {
  const ratings = [5, 5, 4];
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  assert.deepEqual(toStoredAggregate(avg, ratings.length), {
    ratingAverage: 4.67,
    reviewCount: 3,
  });
});

test("a single one-star review is stored as 1, not treated as missing", () => {
  // 1 is falsy-adjacent in a lot of sloppy code paths; make sure it survives.
  assert.deepEqual(toStoredAggregate(1, 1), { ratingAverage: 1, reviewCount: 1 });
});

test("undefined inputs degrade to the empty state instead of throwing", () => {
  assert.deepEqual(toStoredAggregate(undefined, undefined), {
    ratingAverage: null,
    reviewCount: 0,
  });
});
