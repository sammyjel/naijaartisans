// Campaign tagging and attribution parsing.
//
// The failure mode here is silence. A malformed campaign URL does not error —
// it attributes a real customer to nothing, and you find out weeks later when
// the report is empty and the decision it was meant to inform has been made on
// a guess. So the parsing and normalising rules are pinned.

import test from "node:test";
import assert from "node:assert/strict";
import {
  normaliseTag,
  buildCampaignUrl,
  parseUtm,
  inferUntagged,
  isConversion,
  CONVERSIONS,
  UTM_KEYS,
} from "../src/lib/utm.js";

// ── normalising ────────────────────────────────────────────────────────────

test("tags are lowercased so one campaign is not split across rows", () => {
  // "Facebook" and "facebook" are two different sources to every analytics
  // tool, which silently halves a campaign's apparent performance.
  assert.equal(normaliseTag("Facebook"), "facebook");
  assert.equal(normaliseTag("  TikTok  "), "tiktok");
});

test("spaces and punctuation become single dashes", () => {
  assert.equal(normaliseTag("Nigerian Artisans Awareness"), "nigerian-artisans-awareness");
  assert.equal(normaliseTag("artisan video!! 2026"), "artisan-video-2026");
  assert.equal(normaliseTag("a   b"), "a-b");
});

test("leading and trailing dashes are trimmed", () => {
  assert.equal(normaliseTag("--promo--"), "promo");
  assert.equal(normaliseTag("!!!"), "");
});

test("nothing usable yields an empty string, not a broken tag", () => {
  for (const v of ["", null, undefined, "   "]) assert.equal(normaliseTag(v), "");
});

test("tags are length-capped", () => {
  assert.ok(normaliseTag("x".repeat(500)).length <= 80);
});

// ── building links ─────────────────────────────────────────────────────────

test("a built link carries the five parameters", () => {
  const url = buildCampaignUrl({
    destination: "/browse",
    source: "Facebook",
    campaign: "Nigerian Artisans Awareness",
    content: "reel-a",
  });
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://naijaartisans.com/browse");
  assert.equal(u.searchParams.get("utm_source"), "facebook");
  assert.equal(u.searchParams.get("utm_medium"), "social");
  assert.equal(u.searchParams.get("utm_campaign"), "nigerian-artisans-awareness");
  assert.equal(u.searchParams.get("utm_content"), "reel-a");
});

test("existing query parameters on the destination survive tagging", () => {
  // A link to a filtered page must not lose its filter when it is tagged.
  const url = buildCampaignUrl({
    destination: "/browse?category=plumbing&city=Lagos",
    source: "instagram",
    campaign: "promo",
  });
  const u = new URL(url);
  assert.equal(u.searchParams.get("category"), "plumbing");
  assert.equal(u.searchParams.get("city"), "Lagos");
  assert.equal(u.searchParams.get("utm_source"), "instagram");
});

test("empty optional parameters are omitted rather than sent blank", () => {
  const u = new URL(buildCampaignUrl({ destination: "/", source: "x", campaign: "c" }));
  assert.equal(u.searchParams.has("utm_content"), false);
  assert.equal(u.searchParams.has("utm_term"), false);
});

test("a path without a leading slash still works", () => {
  const u = new URL(buildCampaignUrl({ destination: "browse", source: "x", campaign: "c" }));
  assert.equal(u.pathname, "/browse");
});

test("a full URL destination is accepted", () => {
  const u = new URL(
    buildCampaignUrl({ destination: "https://naijaartisans.com/guides", source: "x", campaign: "c" })
  );
  assert.equal(u.pathname, "/guides");
});

// ── parsing what comes back ────────────────────────────────────────────────

test("tags are read back out of a query string", () => {
  const got = parseUtm("?utm_source=facebook&utm_campaign=promo&utm_medium=social");
  assert.equal(got.utm_source, "facebook");
  assert.equal(got.utm_campaign, "promo");
  assert.equal(got.utm_medium, "social");
});

test("a round trip survives", () => {
  const url = buildCampaignUrl({
    destination: "/browse",
    source: "TikTok",
    campaign: "Artisan Video",
    content: "Cut B",
  });
  const got = parseUtm(url);
  assert.equal(got.utm_source, "tiktok");
  assert.equal(got.utm_campaign, "artisan-video");
  assert.equal(got.utm_content, "cut-b");
});

test("an untagged query returns null rather than empty tags", () => {
  // The caller has to tell "no campaign" from "a campaign whose tags are
  // blank" — the second means a broken link worth noticing.
  assert.equal(parseUtm("?page=2"), null);
  assert.equal(parseUtm(""), null);
  assert.equal(parseUtm(null), null);
});

test("every documented UTM key is handled", () => {
  const qs = "?" + UTM_KEYS.map((k) => `${k}=v-${k}`).join("&");
  const got = parseUtm(qs);
  for (const k of UTM_KEYS) assert.ok(got[k], `${k} was dropped`);
});

// ── untagged traffic is labelled honestly ──────────────────────────────────

test("no referrer is direct, not a campaign", () => {
  const r = inferUntagged("");
  assert.equal(r.utm_source, "direct");
  assert.equal(r.utm_medium, "none");
  assert.equal(r.utm_campaign, "", "guessing a campaign would inflate every report");
});

test("search engines are organic, not social", () => {
  assert.equal(inferUntagged("https://www.google.com/search?q=plumber").utm_medium, "organic");
  assert.equal(inferUntagged("https://duckduckgo.com/").utm_medium, "organic");
});

test("social referrers are recognised", () => {
  for (const ref of [
    "https://www.facebook.com/",
    "https://l.instagram.com/",
    "https://www.tiktok.com/",
    "https://t.co/abc",
  ]) {
    assert.equal(inferUntagged(ref).utm_medium, "social", `${ref} not detected as social`);
  }
});

test("an unknown site is a referral, never a campaign", () => {
  const r = inferUntagged("https://someblog.ng/post");
  assert.equal(r.utm_medium, "referral");
  assert.equal(r.utm_campaign, "");
});

// ── conversions are a closed set ───────────────────────────────────────────

test("only known conversions are accepted", () => {
  for (const c of CONVERSIONS) assert.equal(isConversion(c), true);
  // A typo'd event stored anyway produces a report that looks complete and is wrong.
  assert.equal(isConversion("job_post"), false);
  assert.equal(isConversion(""), false);
  assert.equal(isConversion(null), false);
});

test("commerce events this marketplace does not have are rejected", () => {
  // There is no cart and no checkout. Accepting these would invite a report
  // showing zero purchases forever and imply the tracking was broken.
  for (const c of ["add_to_cart", "purchase", "checkout"]) {
    assert.equal(isConversion(c), false, `${c} should not exist on a marketplace`);
  }
});

test("deal_completed is the one that means money moved", () => {
  assert.ok(CONVERSIONS.includes("deal_completed"));
  assert.equal(
    CONVERSIONS[CONVERSIONS.length - 1],
    "deal_completed",
    "ordering is by closeness to revenue; the report relies on it"
  );
});
