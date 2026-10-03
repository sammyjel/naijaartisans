// A job page may only advertise itself as an open vacancy when it genuinely is one.
//
// Google's job-posting guidelines require the markup to describe a real job
// opening, and the Job Postings enhancement is assessed against the SITE — so a
// page claiming a vacancy it does not have risks the rich result on every other
// job page too. Search Console already shows Job Postings as a live enhancement
// here, so there is something real to lose.
//
// Two ways to get this wrong, both guarded below:
//
//   1. A FILLED job still claiming to be open. Became the normal case on
//      2026-09-29: before deals existed exactly one job had ever been closed,
//      so every job page could safely carry the markup. Now a job changes
//      status every time somebody is hired.
//   2. An ADVERT dressed as a vacancy. Found on 2026-10-03: six of eight OPEN
//      jobs were artisans advertising their own services, and all six were
//      being served to Google as JobPostings.
//
// Source-invariant tests, in the same style as rendering.test.mjs — the failure
// they guard against is silent, and only visible weeks later in a Search Console
// report nobody is watching.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const JOB_PAGE = "src/app/jobs/[id]/page.js";
const SITEMAP = "src/app/sitemap.js";
const RULE = "src/lib/job-seo.js";

/** Source with comments stripped, so a rule is never "satisfied" by prose about it. */
function code(path) {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const jobPage = code(JOB_PAGE);
const sitemap = code(SITEMAP);
const rule = code(RULE);

// ── the markup is gated on the shared rule, not an inline condition ────────

test("JobPosting markup is built behind the shared eligibility rule", () => {
  // Inlining the condition here is what let the page and its generateMetadata
  // drift apart: one got the poster-role fix and the other would not have.
  assert.match(
    jobPage,
    /const jobLd\s*=\s*vacancyEligibility\(\{[^}]*\}\)\.indexable\s*\n?\s*\?/,
    "the JobPosting object must be built behind vacancyEligibility(...).indexable"
  );
  assert.match(
    jobPage,
    /\{jobLd\s*&&\s*<JsonLd/,
    "and it must not be rendered when that check produced null"
  );
});

test("the page passes BOTH status and poster role into the rule", () => {
  // Passing only status would silently restore the advert bug while still
  // calling the shared helper.
  const calls = jobPage.match(/vacancyEligibility\(\{[^}]*\}\)/g) || [];
  assert.ok(calls.length >= 2, "both generateMetadata and the page body must consult the rule");
  for (const call of calls) {
    assert.match(call, /status:/, `${call} does not pass status`);
    assert.match(call, /posterRole:/, `${call} does not pass posterRole`);
  }
});

test("the poster's role is actually loaded in both queries", () => {
  // The rule cannot work if the field is never selected — it would receive
  // undefined and quietly mark every job ineligible.
  const selects = jobPage.match(/customer:\s*\{\s*select:\s*\{[^}]*\}/g) || [];
  assert.ok(selects.length >= 2, "both queries must select the customer");
  for (const s of selects) {
    assert.match(s, /role:\s*true/, `${s} does not select role`);
  }
});

test("an open posting carries validThrough so Google can expire it itself", () => {
  // Our status change and Google's next crawl will not line up; validThrough is
  // what covers the gap.
  assert.match(jobPage, /validThrough:\s*validThrough\(/);
});

test("an ineligible job is not indexed", () => {
  assert.match(
    jobPage,
    /robots:\s*indexable\s*\?\s*undefined\s*:\s*\{\s*index:\s*false/,
    "filled jobs and adverts must carry noindex"
  );
});

test("an ineligible job stays reachable rather than 404ing", () => {
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
  const m = rule.match(/VACANCY_DAYS\s*=\s*(\d+)/);
  assert.ok(m, "the validThrough window should be a named constant in the rule module");
  const days = Number(m[1]);
  assert.ok(days >= 14 && days <= 180, `a ${days}-day vacancy window is not plausible`);
});
