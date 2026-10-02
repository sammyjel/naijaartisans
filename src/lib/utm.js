// Campaign tagging and attribution parsing.
//
// No database import and no Next import, so the rules are unit-testable and can
// run on both the server and the browser. They are worth testing: a campaign URL
// with a malformed parameter does not error, it just silently attributes a real
// customer to nothing, and you only discover it when the report is empty.
//
// ── WHAT COUNTS AS A CONVERSION HERE ───────────────────────────────────────
//
// NaijaArtisans is a marketplace, not a shop. There is no cart, no checkout and
// no purchase — so "add to cart" and "purchase", the default events every
// marketing stack assumes, do not exist and must not be invented. What a visitor
// can actually do that is worth money:
//
//   job_posted      a customer described work they want done
//   quote_sent      an artisan responded to one
//   deal_started    a customer hired an artisan
//   deal_completed  the customer confirmed the work was done
//   lead_captured   a lead magnet opt-in
//   signup          an account was created
//
// deal_completed is the only one that means money actually changed hands.

/** The five UTM parameters, in the order Google documents them. */
export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

/** Conversions worth attributing. Ordered by how close each is to revenue. */
export const CONVERSIONS = [
  "signup",
  "lead_captured",
  "job_posted",
  "quote_sent",
  "deal_started",
  "deal_completed",
];

/** Platforms we tag links for. Used to keep utm_source spellings consistent. */
export const SOURCES = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "x",
  "linkedin",
  "whatsapp",
  "email",
  "google",
];

/**
 * Normalises one UTM value.
 *
 * Lowercased and dash-separated on purpose: analytics tools treat "Facebook"
 * and "facebook" as two different sources, which quietly splits one campaign's
 * numbers across several rows in the report. Strips anything that would need
 * escaping so a tagged link can be pasted anywhere without mangling.
 *
 * @param {string|null|undefined} value
 * @returns {string} "" when there is nothing usable
 */
export function normaliseTag(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Builds a campaign URL.
 *
 * Existing query parameters on the destination are preserved — a link to
 * /services/plumbing/lagos?sort=new must not lose its sort when it is tagged.
 *
 * @param {{ destination: string, source: string, medium?: string, campaign: string, content?: string, term?: string, siteUrl?: string }} input
 * @returns {string}
 */
export function buildCampaignUrl({
  destination,
  source,
  medium = "social",
  campaign,
  content,
  term,
  siteUrl = "https://naijaartisans.com",
}) {
  const base = String(siteUrl).replace(/\/+$/, "");
  const path = String(destination || "/").trim() || "/";

  // Accept either a full URL on our own domain or a path.
  const url = /^https?:\/\//i.test(path) ? new URL(path) : new URL(path.startsWith("/") ? path : "/" + path, base);

  const tags = {
    utm_source: normaliseTag(source),
    utm_medium: normaliseTag(medium),
    utm_campaign: normaliseTag(campaign),
    utm_content: normaliseTag(content),
    utm_term: normaliseTag(term),
  };

  for (const key of UTM_KEYS) {
    if (tags[key]) url.searchParams.set(key, tags[key]);
    else url.searchParams.delete(key);
  }

  return url.toString();
}

/**
 * Reads UTM parameters out of a query string or URL.
 *
 * Returns null when there is nothing to attribute, so a caller can tell "this
 * visitor came from a campaign" apart from "this visitor came from a campaign
 * with empty values" — the second is a broken link worth noticing.
 *
 * @param {string} search a query string, or a full URL
 * @returns {{utm_source:string, utm_medium:string, utm_campaign:string, utm_content:string, utm_term:string}|null}
 */
export function parseUtm(search) {
  if (!search) return null;
  const qs = String(search);
  const params = new URLSearchParams(qs.includes("?") ? qs.slice(qs.indexOf("?") + 1) : qs);

  const out = {};
  let any = false;
  for (const key of UTM_KEYS) {
    const v = normaliseTag(params.get(key));
    out[key] = v;
    if (v) any = true;
  }
  // A campaign with no source and no campaign name cannot be reported on.
  if (!any) return null;
  return out;
}

/**
 * Where a visit came from when it carries no UTM tags at all.
 *
 * Most real traffic is untagged — organic search, someone typing the address,
 * a link shared person to person. Guessing a campaign for those would inflate
 * every campaign report; they are labelled honestly instead.
 *
 * @param {string|null|undefined} referrer
 * @returns {{utm_source:string, utm_medium:string, utm_campaign:string}}
 */
export function inferUntagged(referrer) {
  const ref = String(referrer || "").toLowerCase();
  if (!ref) return { utm_source: "direct", utm_medium: "none", utm_campaign: "" };

  let host = "";
  try {
    host = new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return { utm_source: "unknown", utm_medium: "referral", utm_campaign: "" };
  }

  if (/(^|\.)google\.|(^|\.)bing\.|(^|\.)duckduckgo\.|(^|\.)yahoo\./.test(host)) {
    return { utm_source: host.split(".")[0], utm_medium: "organic", utm_campaign: "" };
  }
  if (/(^|\.)facebook\.|(^|\.)fb\.|(^|\.)instagram\.|(^|\.)tiktok\.|(^|\.)youtube\.|(^|\.)linkedin\.|(^|\.)t\.co$|(^|\.)x\.com$|(^|\.)whatsapp\./.test(host)) {
    const name = host.replace(/\.(com|net|org|co|me)(\.[a-z]{2})?$/, "").split(".").pop();
    return { utm_source: name, utm_medium: "social", utm_campaign: "" };
  }
  return { utm_source: host, utm_medium: "referral", utm_campaign: "" };
}

/**
 * True when a conversion name is one we actually record.
 *
 * Rejects rather than accepts unknown names: a typo'd event that is stored
 * anyway produces a report that looks complete and is wrong.
 */
export function isConversion(name) {
  return CONVERSIONS.includes(String(name || ""));
}
