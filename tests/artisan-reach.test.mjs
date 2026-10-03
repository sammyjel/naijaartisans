// The reach panel's ranking.
//
// The point of this module is to answer an artisan's real question — "how do I
// get seen?" — with something true and actionable. Two ways it could fail
// quietly: ranking a cosmetic fix above one that adds a page, and claiming a
// page URL that does not exist. Both are pinned here.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  reachGaps,
  indexedPages,
  IMPACT_HIGH,
  IMPACT_MEDIUM,
  IMPACT_LOW,
} from "../src/lib/artisan-reach.js";

const svc = (over = {}) => ({
  city: "Lagos",
  category: { slug: "plumbing", name: "Plumbing" },
  description: "x".repeat(200),
  priceMin: 5000,
  priceMax: 20000,
  ...over,
});

const complete = {
  bio: "Twelve years fitting and repairing domestic plumbing across Lagos.",
  avatarUrl: "https://example.com/a.jpg",
  galleryUrls: ["https://example.com/1.jpg"],
  phone: "+2348012345678",
};

// ── the pages ──────────────────────────────────────────────────────────────

test("one page per distinct category and city pair", () => {
  const pages = indexedPages([
    svc(),
    svc(), // same pair again — must not be double counted
    svc({ city: "Abuja" }),
    svc({ category: { slug: "carpentry", name: "Carpentry" } }),
  ]);
  assert.deepEqual(
    pages.map((p) => p.path).sort(),
    ["/services/carpentry/lagos", "/services/plumbing/abuja", "/services/plumbing/lagos"]
  );
});

test("page paths match the sitemap's slug shape", () => {
  const [page] = indexedPages([svc({ city: "Port Harcourt" })]);
  assert.equal(page.path, "/services/plumbing/port-harcourt");
});

test("a listing that cannot form a real URL is not claimed as a page", () => {
  // Claiming a page that 404s would be worse than showing none.
  assert.deepEqual(indexedPages([svc({ city: "" }), svc({ category: null })]), []);
  assert.deepEqual(indexedPages([]), []);
  assert.deepEqual(indexedPages(), []);
});

test("category slug is derived from the name when no slug is given", () => {
  const [page] = indexedPages([svc({ category: { name: "Solar Installation" } })]);
  assert.equal(page.path, "/services/solar-installation/lagos");
});

// ── the ranking ────────────────────────────────────────────────────────────

test("with no listing, that is the only thing offered", () => {
  // Every other suggestion presumes a listing exists, so offering them would be
  // a to-do list the artisan cannot action.
  const { gaps, pages } = reachGaps({ profile: {}, services: [] });
  assert.deepEqual(gaps.map((g) => g.id), ["no_listing"]);
  assert.deepEqual(pages, []);
});

test("page-adding gaps always rank above page-improving ones", () => {
  const { gaps } = reachGaps({
    profile: { galleryUrls: [], avatarUrl: null, bio: "", phone: null },
    services: [svc({ priceMin: null, priceMax: null, description: "short" })],
  });
  const firstImprovement = gaps.findIndex((g) => !g.addsPage);
  const lastPageAdder = gaps.map((g) => g.addsPage).lastIndexOf(true);
  assert.ok(lastPageAdder < firstImprovement, "a page-improving gap was ranked above a page-adding one");
});

test("within a group, higher impact comes first", () => {
  const { gaps } = reachGaps({
    profile: { galleryUrls: [], avatarUrl: null, bio: "", phone: null },
    services: [svc({ city: "Lagos" }), svc({ city: "Abuja" }), svc({ category: { slug: "tiling", name: "Tiling" } })],
  });
  const improvements = gaps.filter((g) => !g.addsPage).map((g) => g.impact);
  const rank = { [IMPACT_HIGH]: 0, [IMPACT_MEDIUM]: 1, [IMPACT_LOW]: 2 };
  for (let i = 1; i < improvements.length; i += 1) {
    assert.ok(
      rank[improvements[i - 1]] <= rank[improvements[i]],
      `impact order broken: ${improvements.join(" > ")}`
    );
  }
});

test("a single city prompts adding another, several cities do not", () => {
  const one = reachGaps({ profile: complete, services: [svc()] });
  assert.ok(one.gaps.some((g) => g.id === "one_city"));

  const two = reachGaps({ profile: complete, services: [svc(), svc({ city: "Abuja" })] });
  assert.ok(!two.gaps.some((g) => g.id === "one_city"));
});

test("a single category prompts adding another", () => {
  const one = reachGaps({ profile: complete, services: [svc(), svc({ city: "Abuja" })] });
  assert.ok(one.gaps.some((g) => g.id === "one_category"));

  const two = reachGaps({
    profile: complete,
    services: [svc(), svc({ category: { slug: "tiling", name: "Tiling" } })],
  });
  assert.ok(!two.gaps.some((g) => g.id === "one_category"));
});

test("a complete profile with spread listings has nothing left to suggest", () => {
  const { gaps } = reachGaps({
    profile: complete,
    services: [svc(), svc({ city: "Abuja" }), svc({ category: { slug: "tiling", name: "Tiling" } })],
  });
  assert.deepEqual(gaps, [], `unexpected: ${gaps.map((g) => g.id).join(", ")}`);
});

test("missing profile pieces are each reported once", () => {
  const { gaps } = reachGaps({
    profile: { galleryUrls: [], avatarUrl: null, bio: "", phone: null },
    services: [svc(), svc({ city: "Abuja" }), svc({ category: { slug: "tiling", name: "Tiling" } })],
  });
  const ids = gaps.map((g) => g.id);
  for (const id of ["no_photos", "no_avatar", "no_bio", "no_phone"]) {
    assert.equal(ids.filter((x) => x === id).length, 1, `${id} should appear exactly once`);
  }
});

test("a price gap counts only the listings actually missing one", () => {
  const { gaps } = reachGaps({
    profile: complete,
    services: [svc(), svc({ city: "Abuja", priceMin: null, priceMax: null })],
  });
  const g = gaps.find((x) => x.id === "no_price");
  assert.ok(g, "the gap should be raised");
  assert.match(g.label, /1 of your listings/, `label was: ${g.label}`);
});

test("one price bound is enough to count as priced", () => {
  const { gaps } = reachGaps({
    profile: complete,
    services: [svc({ priceMin: 5000, priceMax: null }), svc({ city: "Abuja" })],
  });
  assert.ok(!gaps.some((g) => g.id === "no_price"));
});

test("no input at all does not throw", () => {
  for (const input of [undefined, {}, { profile: null, services: null }]) {
    const r = reachGaps(input);
    assert.ok(Array.isArray(r.gaps));
    assert.ok(Array.isArray(r.pages));
  }
});

test("every gap is actionable — a label, a reason, and somewhere to go", () => {
  const { gaps } = reachGaps({
    profile: { galleryUrls: [], avatarUrl: null, bio: "", phone: null },
    services: [svc({ priceMin: null, priceMax: null, description: "short" })],
  });
  assert.ok(gaps.length > 0);
  for (const g of gaps) {
    assert.ok(g.label && g.why && g.action, `${g.id} is missing text`);
    assert.match(g.href, /^\//, `${g.id} has no internal destination`);
    assert.ok([IMPACT_HIGH, IMPACT_MEDIUM, IMPACT_LOW].includes(g.impact), `${g.id} impact`);
    assert.equal(typeof g.addsPage, "boolean", `${g.id} addsPage`);
  }
});

// ── no invented numbers ────────────────────────────────────────────────────

test("no gap quotes a statistic we have not measured", () => {
  // "Listings with photos get 3x more clicks" would be made up. Nothing here
  // measures conversion, so nothing here may claim it.
  const { gaps } = reachGaps({
    profile: { galleryUrls: [], avatarUrl: null, bio: "", phone: null },
    services: [svc({ priceMin: null, priceMax: null, description: "short" })],
  });
  for (const g of gaps) {
    const text = `${g.label} ${g.why}`;
    assert.ok(!/\d+\s*%/.test(text), `${g.id} quotes a percentage: ${text}`);
    assert.ok(!/\b\d+\s*x\b/i.test(text), `${g.id} quotes a multiplier: ${text}`);
    assert.ok(
      !/\b(more likely|twice|double|triple)\b/i.test(text),
      `${g.id} implies an unmeasured effect size: ${text}`
    );
  }
});

// ── the fork is a fork, not a lock ─────────────────────────────────────────

test("an artisan is never blocked from posting a real job", () => {
  // The whole point of the split is that it offers a choice. If this page ever
  // starts returning early on role alone, a plumber can no longer hire an
  // electrician, which is a real customer turned away.
  const page = readFileSync("src/app/post-job/page.js", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

  assert.match(
    page,
    /user\.role\s*===\s*["']ARTISAN["']\s*&&\s*!explicitHire\s*&&\s*!intent/,
    "the fork must depend on intent, not on role alone"
  );
  assert.match(page, /setIntent\(["']hire["']\)/, "the hire door must exist");
  assert.ok(
    !/router\.push\([^)]*\)[\s\S]{0,80}role\s*!==\s*["']CUSTOMER["']/.test(page),
    "artisans must not be redirected away from posting a job"
  );
});

test("an explicit intent to hire skips the fork", () => {
  // Arriving from "Request a quote" on an artisan's profile already says why
  // they are here; asking again would be a pointless extra click.
  const page = readFileSync("src/app/post-job/page.js", "utf8");
  assert.match(page, /const explicitHire\s*=\s*Boolean\(fromName\)\s*\|\|/);
});
