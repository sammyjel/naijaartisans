// Rendering strategy per route.
//
// This is the guard on the Phase 5 work. The failure it prevents is subtle and
// expensive: someone adds `export const revalidate` to a page that calls cookies()
// (so it silently stays dynamic and nothing is cached), or drops force-dynamic
// from an authenticated page (so one user's dashboard is served to another from
// the CDN). Neither shows up as an error — only as a cache MISS, or a leak.
//
// Reading the route files is deliberate: the invariant being asserted is a
// property of the source, and checking it needs no database or running server.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../src/app/" + p, import.meta.url), "utf8");

/** Pages that must be cacheable: public marketing content. */
const ISR_PAGES = [
  "page.js",
  "services/page.js",
  "services/[category]/page.js",
  "services/[category]/[city]/page.js",
  "artisans/[id]/page.js",
  "sitemap.js",
];

/** Pages that must stay dynamic, with the reason each one cannot be cached. */
const DYNAMIC_PAGES = {
  "browse/page.js": "reads searchParams (category/city/q/lat/lng)",
  "jobs/page.js": "reads searchParams and shows live job state",
  "jobs/[id]/page.js": "calls getCurrentUser() -> cookies()",
  "admin/page.js": "admin console",
};

/** Anything that forces dynamic rendering regardless of a revalidate export. */
const DYNAMIC_TRIGGERS = [
  [/\bcookies\s*\(/, "cookies()"],
  [/\bheaders\s*\(/, "headers()"],
  [/unstable_noStore|noStore\s*\(/, "noStore()"],
  [/cache:\s*["']no-store["']/, 'cache: "no-store"'],
  [/\bgetCurrentUser\s*\(/, "getCurrentUser()"],
  [/\bsearchParams\b/, "searchParams"],
];

/** Strips comments so prose about cookies() is not mistaken for a call. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
}

for (const file of ISR_PAGES) {
  test(`${file} is ISR with hourly revalidation`, () => {
    const src = read(file);
    assert.match(
      src,
      /export const revalidate = \d+/,
      `${file} should export a revalidate window`
    );
    assert.equal(
      src.includes('export const dynamic = "force-dynamic"'),
      false,
      `${file} still declares force-dynamic, which overrides revalidate entirely`
    );
  });

  test(`${file} invokes no dynamic API (so revalidate is not cosmetic)`, () => {
    const code = stripComments(read(file));
    const found = DYNAMIC_TRIGGERS.filter(([re]) => re.test(code)).map(([, name]) => name);
    assert.deepEqual(
      found,
      [],
      `${file} exports revalidate but calls ${found.join(", ")} - it would render dynamically anyway`
    );
  });
}

for (const [file, reason] of Object.entries(DYNAMIC_PAGES)) {
  test(`${file} stays dynamic (${reason})`, () => {
    const src = read(file);
    assert.match(
      src,
      /export const dynamic = "force-dynamic"/,
      `${file} must stay dynamic: ${reason}`
    );
  });
}

test("no authenticated or admin page has been made cacheable", () => {
  for (const file of ["dashboard/page.js", "admin/page.js"]) {
    const src = read(file);
    assert.equal(
      /export const revalidate/.test(src),
      false,
      `${file} must never be cached - it renders one specific user's data`
    );
  }
});

test("browse is not given a revalidate it cannot honour", () => {
  // Adding one here would be exactly the cosmetic fix the brief warns against:
  // the page reads searchParams, so it renders dynamically whatever is exported.
  const src = read("browse/page.js");
  assert.equal(
    /export const revalidate/.test(src),
    false,
    "browse reads searchParams; a revalidate export would cache nothing and mislead"
  );
});

test("every ISR page explains why it is safe to cache", () => {
  // A bare `revalidate` with no reasoning is how the next person
  // reintroduces a dynamic API call into a cached page.
  for (const file of ISR_PAGES) {
    assert.match(read(file), /ISR|cached|revalidat/i, `${file} should document its caching choice`);
  }
});

// Dynamic segments need generateStaticParams as well as revalidate. This was
// found by inspecting .next/prerender-manifest.json after a build: with
// revalidate alone these three routes were absent from the manifest entirely and
// Next served them as ƒ (Dynamic, server-rendered on demand) — i.e. `revalidate`
// was doing nothing, which is precisely the cosmetic fix to avoid.
const ISR_DYNAMIC_SEGMENTS = [
  "services/[category]/page.js",
  "services/[category]/[city]/page.js",
  "artisans/[id]/page.js",
];

for (const file of ISR_DYNAMIC_SEGMENTS) {
  test(`${file} declares generateStaticParams so revalidate actually caches`, () => {
    const src = read(file);
    assert.match(
      src,
      /export async function generateStaticParams\(/,
      `${file} is a dynamic segment: without generateStaticParams it is never registered for ISR, and revalidate is inert`
    );
  });

  test(`${file} degrades to on-demand rather than failing the build`, () => {
    const src = read(file);
    const fn = src.slice(src.indexOf("export async function generateStaticParams("));
    const body = fn.slice(0, fn.indexOf("\n}") + 2);
    assert.match(body, /try\s*\{/, "a DB outage at build time must not fail the deploy");
    assert.match(body, /return \[\]/, "the fallback should be an empty param list");
  });
}

test("the 153 marketing pages are served by ISR routes", () => {
  // 87 city pages + 51 artisan profiles + 15 guides are generated by these route
  // files; the count lives in the data, so this asserts the routes are the ISR set.
  const cityPage = read("services/[category]/[city]/page.js");
  const artisanPage = read("artisans/[id]/page.js");
  for (const [name, src] of [["city landing", cityPage], ["artisan profile", artisanPage]]) {
    assert.match(src, /export const revalidate = \d+/, `${name} pages must be cacheable`);
  }
  // Guides were already statically generated and must stay that way.
  assert.match(
    read("guides/[slug]/page.js"),
    /generateStaticParams/,
    "guides should remain statically generated"
  );
});
