// Sitemap lastmod policy.
//
// The central requirement: never invent a timestamp. A sitemap that claims all
// 174 URLs changed this morning is worse than one with no lastmod at all, so the
// most important assertions here are the NEGATIVE ones — that unparseable input
// yields null rather than today's date.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseEditorialDate, newest, lastMod } from "../src/lib/sitemap-dates.js";
import { allGuides } from "../src/lib/guides.js";

test("parses a month-and-year editorial date to the first of that month, UTC", () => {
  const d = parseEditorialDate("June 2026");
  assert.ok(d instanceof Date);
  assert.equal(d.toISOString(), "2026-06-01T00:00:00.000Z");
});

test("is case and whitespace insensitive", () => {
  assert.equal(parseEditorialDate("  june 2026 ").toISOString(), "2026-06-01T00:00:00.000Z");
  assert.equal(parseEditorialDate("JUNE 2026").toISOString(), "2026-06-01T00:00:00.000Z");
});

test("handles every month name", () => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  months.forEach((name, i) => {
    const d = parseEditorialDate(`${name} 2026`);
    assert.ok(d, `${name} should parse`);
    assert.equal(d.getUTCMonth(), i, `${name} should be month index ${i}`);
  });
});

test("returns null - NOT today - for unparseable values", () => {
  for (const bad of ["", "   ", "Junuary 2026", "2026", "June", "next week", "06/2026", null, undefined, 42, {}]) {
    const result = parseEditorialDate(bad);
    assert.equal(result, null, `expected null for ${JSON.stringify(bad)}, got ${result}`);
  }
});

test("a rejected value must not quietly become the current date", () => {
  // This is the specific regression the brief calls out: no `new Date()` fallback.
  const result = parseEditorialDate("not a date");
  assert.ok(!(result instanceof Date), "an unparseable date must never yield a Date object");
});

test("every guide in the repo has a parseable editorial date", () => {
  const guides = allGuides();
  assert.ok(guides.length > 0, "expected guides to exist");
  const unparseable = guides.filter((g) => !parseEditorialDate(g.updated));
  assert.deepEqual(
    unparseable.map((g) => `${g.slug}: ${JSON.stringify(g.updated)}`),
    [],
    "every guide must carry a date the sitemap can publish"
  );
});

test("lastMod omits the key entirely when there is no timestamp", () => {
  assert.deepEqual(lastMod(null), {});
  assert.deepEqual(lastMod(undefined), {});
  // An absent property is what makes Next leave <lastmod> out of the XML.
  assert.equal(Object.hasOwn(lastMod(null), "lastModified"), false);
});

test("lastMod includes the timestamp when one exists", () => {
  const d = new Date("2026-09-01T10:00:00Z");
  assert.deepEqual(lastMod(d), { lastModified: d });
});

test("newest picks the later of two dates", () => {
  const older = new Date("2026-01-01T00:00:00Z");
  const newer = new Date("2026-09-01T00:00:00Z");
  assert.equal(newest(older, newer), newer);
  assert.equal(newest(newer, older), newer);
});

test("newest tolerates nulls on either side", () => {
  const d = new Date("2026-01-01T00:00:00Z");
  assert.equal(newest(null, d), d);
  assert.equal(newest(d, null), d);
  assert.equal(newest(null, null), null);
});

test("newest is usable for rolling city timestamps up to a category", () => {
  const perCity = [
    new Date("2026-03-01T00:00:00Z"),
    new Date("2026-08-15T00:00:00Z"),
    new Date("2026-01-09T00:00:00Z"),
  ];
  const rolled = perCity.reduce((acc, d) => newest(acc, d), null);
  assert.equal(rolled.toISOString(), "2026-08-15T00:00:00.000Z");
});

// ── structural assertions on the generator itself ──────────────────────────
// The generator needs a live database to execute, so these check the invariants
// that a refactor could silently break.

const sitemapSrc = readFileSync(new URL("../src/app/sitemap.js", import.meta.url), "utf8");

/** Comments are stripped so prose *about* new Date() is not read as a call. */
const sitemapCode = sitemapSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^[ \t]*\/\/.*$/gm, "");

test("the sitemap generator contains no new Date() fallback", () => {
  assert.equal(
    /new Date\(\s*\)/.test(sitemapCode),
    false,
    "found a bare new Date() in sitemap.js - that would fabricate a lastmod"
  );
});

test("the sitemap is cached rather than force-dynamic", () => {
  assert.match(sitemapSrc, /export const revalidate = 3600/);
  assert.equal(
    sitemapSrc.includes('export const dynamic = "force-dynamic"'),
    false,
    "the sitemap should be ISR, not re-queried on every crawl"
  );
});

test("artisan, job and service URLs all draw lastmod from updatedAt", () => {
  for (const field of ["a.updatedAt", "j.updatedAt", "g._max.updatedAt"]) {
    assert.ok(
      sitemapSrc.includes(`lastMod(${field})`),
      `expected lastMod(${field}) so the timestamp comes from the database`
    );
  }
});

test("service timestamps are grouped in SQL rather than queried per page", () => {
  // 87 city landing pages: a MAX() per page would be 87 extra round trips.
  assert.match(sitemapSrc, /groupBy/, "expected a groupBy to aggregate service timestamps");
  assert.match(sitemapSrc, /_max:\s*\{\s*updatedAt:\s*true\s*\}/);
});

test("static hand-written routes are built without a lastModified key", () => {
  const staticBlock = sitemapSrc.slice(
    sitemapSrc.indexOf("const staticRoutes"),
    sitemapSrc.indexOf("const guideRoutes")
  );
  assert.ok(staticBlock.length > 0, "could not locate the staticRoutes block");
  assert.equal(
    /lastMod|lastModified:/.test(staticBlock),
    false,
    "hand-written pages have no timestamp source, so they must omit lastmod"
  );
});
