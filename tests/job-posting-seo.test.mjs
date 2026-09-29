// A closed job must stop advertising itself as an open vacancy.
//
// Google's job-posting guidelines require expired postings to leave the index.
// Leaving JobPosting markup on a filled job earns "expired job posting" warnings,
// and those are assessed against the SITE — the rich result can be lost across
// every job page, not only the stale one. Search Console already shows Job
// Postings as a live enhancement here, so there is something real to lose.
//
// This became the normal case rather than an edge case on 2026-09-29: before
// deals existed exactly one job had ever been closed, so every job page could
// safely carry the markup. Now a job changes status every time someone is hired.
//
// Source-invariant tests, in the same style as rendering.test.mjs — the failure
// they guard against is silent, and only visible weeks later in a Search Console
// report nobody is watching.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const JOB_PAGE = "src/app/jobs/[id]/page.js";
const SITEMAP = "src/app/sitemap.js";

/** Source with comments stripped, so a rule is never "satisfied" by prose about it. */
function code(path) {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const jobPage = code(JOB_PAGE);
const sitemap = code(SITEMAP);

test("JobPosting markup is conditional on the job being OPEN", () => {
  assert.match(
    jobPage,
    /job\.status\s*===\s*["']OPEN["']\s*\?/,
    "the JobPosting object must be built behind an OPEN check"
  );
  assert.match(
    jobPage,
    /\{jobLd\s*&&\s*<JsonLd/,
    "and it must not be rendered when that check produced null"
  );
});

test("an open posting carries validThrough so Google can expire it itself", () => {
  // Our status change and Google's next crawl will not line up; validThrough is
  // what covers the gap.
  assert.match(jobPage, /validThrough:/);
});

test("a job that is no longer open is not indexed", () => {
  assert.match(
    jobPage,
    /robots:\s*isOpen\s*\?\s*undefined\s*:\s*\{\s*index:\s*false/,
    "filled jobs must carry noindex"
  );
});

test("a filled job stays reachable rather than 404ing", () => {
  // The page still has value to anyone holding the link — its quotes and
  // outcome. noindex removes it from search; it must not remove it from the web.
  assert.ok(
    !/notFound\(\)[\s\S]{0,200}status[\s\S]{0,40}OPEN/.test(jobPage),
    "a non-open job should not be turned into a 404"
  );
  assert.match(jobPage, /follow:\s*true/, "links out of a filled job should still be followed");
});

test("only OPEN jobs are listed in the sitemap", () => {
  assert.match(
    sitemap,
    /jobRequest\.findMany\(\{[\s\S]{0,120}status:\s*["']OPEN["']/,
    "closed jobs must drop out of the sitemap"
  );
});

test("the vacancy window is a real number of days, not an open-ended guess", () => {
  const m = jobPage.match(/VACANCY_DAYS\s*=\s*(\d+)/);
  assert.ok(m, "the validThrough window should be a named constant");
  const days = Number(m[1]);
  assert.ok(days >= 14 && days <= 180, `a ${days}-day vacancy window is not plausible`);
});
