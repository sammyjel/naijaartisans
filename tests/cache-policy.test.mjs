// Caching policy for the 2026-10-01 Neon quota outage.
//
// The dangerous failure here is silent and wrong, not loud and broken: if
// isUnfiltered() says true for a request that DOES carry filters, the page
// serves the cached unfiltered listing and the visitor gets results they did not
// ask for — a search for plumbers in Kano returning every artisan in Nigeria.
// Nothing errors. So the predicate is pinned hard.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isUnfiltered,
  tagsForWrite,
  TAGS,
  PAGE_TTL,
  LISTINGS_TTL,
  JOBS_TTL,
  CATEGORIES_TTL,
} from "../src/lib/cache-policy.js";

// ── the predicate everything rests on ──────────────────────────────────────

test("a bare request is unfiltered", () => {
  assert.equal(isUnfiltered({}), true);
  assert.equal(isUnfiltered(undefined), true);
});

test("any filter at all makes it filtered", () => {
  for (const k of ["category", "city", "q", "lat", "lng"]) {
    assert.equal(isUnfiltered({ [k]: "x" }), false, `${k} was ignored — cached results would be wrong`);
  }
});

test("empty and whitespace values are not filters", () => {
  // "?q=" and "?q=%20" are what an empty search box submits; treating them as
  // filters would bypass the cache on the most common request of all.
  assert.equal(isUnfiltered({ category: "", city: "", q: "   " }), true);
  assert.equal(isUnfiltered({ q: null, city: undefined }), true);
});

test("a geo search is filtered even though it sets no category", () => {
  assert.equal(isUnfiltered({ lat: "6.5", lng: "3.3" }), false);
});

test("unrelated parameters do not defeat the cache", () => {
  // UTM tags arrive on every social click; they must not force a database hit.
  assert.equal(isUnfiltered({ utm_source: "facebook", utm_campaign: "x" }), true);
});

test("the jobs board checks only its own two filters", () => {
  assert.equal(isUnfiltered({ q: "plumber" }, ["category", "city"]), true);
  assert.equal(isUnfiltered({ city: "Lagos" }, ["category", "city"]), false);
});

// ── what each write invalidates ────────────────────────────────────────────

test("a new job busts the board and nothing else", () => {
  assert.deepEqual(tagsForWrite("job"), [TAGS.JOBS]);
});

test("a review busts what actually renders a rating", () => {
  // Stars appear on the profile AND on every /browse card, so both.
  const tags = tagsForWrite("review");
  assert.ok(tags.includes(TAGS.ARTISANS));
  assert.ok(tags.includes(TAGS.SERVICES));
  assert.ok(!tags.includes(TAGS.JOBS), "a review does not change the job board");
});

test("a completed deal busts the pages showing the completed count", () => {
  const tags = tagsForWrite("deal");
  assert.ok(tags.includes(TAGS.ARTISANS) && tags.includes(TAGS.SERVICES));
});

test("an unknown event busts nothing rather than everything", () => {
  // Busting all four on anything unrecognised would undo the fix one careless
  // caller at a time.
  assert.deepEqual(tagsForWrite("something-new"), []);
});

// ── the numbers that decide the bill ───────────────────────────────────────

test("page TTL is at least a day", () => {
  // It was 3600 across 141 pages, which is what kept the database awake 24/7.
  assert.ok(PAGE_TTL >= 86400, `PAGE_TTL of ${PAGE_TTL}s would reintroduce the outage`);
});

test("no page-level revalidate is left at the old hourly value", () => {
  const files = [
    "src/app/page.js",
    "src/app/services/page.js",
    "src/app/services/[category]/page.js",
    "src/app/services/[category]/[city]/page.js",
    "src/app/artisans/[id]/page.js",
    "src/app/sitemap.js",
  ];
  const stale = files.filter((f) => /export const revalidate = 3600\b/.test(readFileSync(f, "utf8")));
  assert.deepEqual(stale, [], "these still revalidate hourly: " + stale.join(", "));
});

test("the job board is fresher than the listings, which are fresher than categories", () => {
  // Staleness is felt most on the job board (quoting on taken work) and least on
  // categories (which change a few times a year).
  assert.ok(JOBS_TTL < LISTINGS_TTL, "a stale job board costs an artisan a wasted quote");
  assert.ok(LISTINGS_TTL < CATEGORIES_TTL);
});

// ── the fix is only safe because writes bust the cache ─────────────────────

test("every public write path busts the cache", () => {
  // A day-long TTL without this means a new artisan is invisible for a day.
  const writers = [
    "src/app/api/jobs/route.js",
    "src/app/api/services/route.js",
    "src/app/api/reviews/route.js",
    "src/app/api/deals/route.js",
    "src/app/api/deals/[id]/route.js",
  ];
  const missing = writers.filter((f) => !/revalidateFor\(/.test(readFileSync(f, "utf8")));
  assert.deepEqual(missing, [], "these write without busting the cache: " + missing.join(", "));
});
