// What an artisan can actually do to be found, ranked by what it changes.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────
//
// On 2026-10-03 six artisans posted adverts into the customer job board. All
// six already had service listings, so this was never them failing to find
// /services/new. A listing is passive — it waits in a directory. The job board
// is active: posting there fired 46 notification emails. They were not looking
// for a listing, they were looking for reach.
//
// Their reach already exists and is invisible to them: every distinct
// (category, city) pair across their listings mints a /services/<cat>/<city>
// page, and those pages are what earn this site's organic clicks. This module
// makes that visible and turns "shout louder" into "fill in the thing that adds
// another indexed page".
//
// DB-free so the ranking can be tested without a database.
//
// ── NO INVENTED NUMBERS ────────────────────────────────────────────────────
//
// Every `why` below states a reason, never a statistic. We have no measurement
// of what a price range or a photo does to conversion on this site, so claiming
// one would be making it up. The page count is different: that is a real,
// countable fact about the sitemap.

/** Minimum description length before it stops telling a customer anything. */
const THIN_DESCRIPTION = 120;

export const IMPACT_HIGH = "high";
export const IMPACT_MEDIUM = "medium";
export const IMPACT_LOW = "low";

/** Mirrors lib/constants.js citySlug so page URLs match the sitemap exactly. */
function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * The /services/<category>/<city> pages this artisan currently appears on.
 *
 * One page per distinct (category, city) pair — the same grouping app/sitemap.js
 * uses, so this count is the real number of indexed pages carrying their name.
 *
 * @param {Array<{ city?: string, category?: { slug?: string, name?: string } }>} services
 * @returns {Array<{ path: string, category: string, city: string }>}
 */
export function indexedPages(services = []) {
  const seen = new Map();
  for (const s of Array.isArray(services) ? services : []) {
    const categorySlug = s?.category?.slug || slug(s?.category?.name);
    const citySlug = slug(s?.city);
    if (!categorySlug || !citySlug) continue; // cannot build a real URL — do not claim one
    const path = `/services/${categorySlug}/${citySlug}`;
    if (!seen.has(path)) {
      seen.set(path, {
        path,
        category: s?.category?.name || categorySlug,
        city: s?.city || citySlug,
      });
    }
  }
  return [...seen.values()];
}

/**
 * Gaps worth closing, most impactful first.
 *
 * "Impactful" here means: does closing it create another indexed page, or does
 * it only improve a page that already exists? The first kind is ranked above the
 * second, because that is the difference the artisan is actually asking for.
 *
 * @param {{
 *   profile?: { bio?: string|null, avatarUrl?: string|null, galleryUrls?: string[], phone?: string|null },
 *   services?: Array<object>,
 * }} input
 */
export function reachGaps({ profile, services } = {}) {
  // Defaults fire only on undefined, so an explicit null has to be handled here.
  // Callers pass whatever the database returned, and a profile row can be null.
  const prof = profile || {};
  const list = Array.isArray(services) ? services : [];

  const gaps = [];
  const pages = indexedPages(list);

  // ── adds a new page ──────────────────────────────────────────────────────

  if (list.length === 0) {
    gaps.push({
      id: "no_listing",
      label: "Create your first service listing",
      why: "Without a listing you do not appear on any category or city page, which is where customers searching Google arrive.",
      action: "Add a listing",
      href: "/services/new",
      impact: IMPACT_HIGH,
      addsPage: true,
    });
    // Nothing below is actionable yet — every other gap presumes a listing.
    return { pages, gaps: rank(gaps) };
  }

  const cities = new Set(list.map((s) => slug(s?.city)).filter(Boolean));
  const categories = new Set(
    list.map((s) => s?.category?.slug || slug(s?.category?.name)).filter(Boolean)
  );

  if (cities.size === 1) {
    gaps.push({
      id: "one_city",
      label: "Add another city you travel to",
      why: "Each city you list in creates a separate page you appear on. You are currently on pages for one city only.",
      action: "Add a listing in another city",
      href: "/services/new",
      impact: IMPACT_HIGH,
      addsPage: true,
    });
  }

  if (categories.size === 1) {
    gaps.push({
      id: "one_category",
      label: "Add a second trade you offer",
      why: "A second category puts you on that category's pages too, for every city you work in.",
      action: "Add another listing",
      href: "/services/new",
      impact: IMPACT_MEDIUM,
      addsPage: true,
    });
  }

  // ── improves pages that already exist ────────────────────────────────────

  const noPrice = list.filter((s) => s?.priceMin == null && s?.priceMax == null);
  if (noPrice.length) {
    gaps.push({
      id: "no_price",
      label: noPrice.length === list.length
        ? "Add a price range to your listings"
        : `Add a price range to ${noPrice.length} of your listings`,
      why: "A listing with no price gives a customer nothing to compare, so they have to message you to find out.",
      action: "Set a price range",
      href: "/dashboard",
      impact: IMPACT_HIGH,
      addsPage: false,
    });
  }

  const thin = list.filter((s) => String(s?.description || "").trim().length < THIN_DESCRIPTION);
  if (thin.length) {
    gaps.push({
      id: "thin_description",
      label: `Write more detail on ${thin.length === list.length ? "your listings" : `${thin.length} of your listings`}`,
      why: "The description is the text Google reads and the customer judges you on. A short one gives both of them little to go on.",
      action: "Expand the description",
      href: "/dashboard",
      impact: IMPACT_MEDIUM,
      addsPage: false,
    });
  }

  if (!(prof.galleryUrls || []).length) {
    gaps.push({
      id: "no_photos",
      label: "Add photos of your finished work",
      why: "Your profile has no work photos, so a customer comparing you with someone who has them has nothing of yours to look at.",
      action: "Upload work photos",
      href: "/dashboard",
      impact: IMPACT_HIGH,
      addsPage: false,
    });
  }

  if (!prof.avatarUrl) {
    gaps.push({
      id: "no_avatar",
      label: "Add a profile photo",
      why: "A profile with no photo of the person is harder to trust than one with it.",
      action: "Upload a photo",
      href: "/dashboard",
      impact: IMPACT_MEDIUM,
      addsPage: false,
    });
  }

  if (String(prof.bio || "").trim().length < 40) {
    gaps.push({
      id: "no_bio",
      label: "Write a short bio",
      why: "Your bio appears on your profile page and tells a customer who they would be hiring.",
      action: "Write a bio",
      href: "/dashboard",
      impact: IMPACT_LOW,
      addsPage: false,
    });
  }

  if (!prof.phone) {
    gaps.push({
      id: "no_phone",
      label: "Add your phone number",
      why: "Without a number a customer who wants to hire you has no fast way to reach you.",
      action: "Add a number",
      href: "/dashboard",
      impact: IMPACT_HIGH,
      addsPage: false,
    });
  }

  return { pages, gaps: rank(gaps) };
}

const IMPACT_RANK = { [IMPACT_HIGH]: 0, [IMPACT_MEDIUM]: 1, [IMPACT_LOW]: 2 };

/**
 * Page-adding gaps first, then by impact. Stable, so two gaps of equal weight
 * keep the order they were defined in rather than shuffling between renders.
 */
function rank(gaps) {
  return gaps
    .map((gap, i) => ({ gap, i }))
    .sort((a, b) => {
      if (a.gap.addsPage !== b.gap.addsPage) return a.gap.addsPage ? -1 : 1;
      const byImpact = IMPACT_RANK[a.gap.impact] - IMPACT_RANK[b.gap.impact];
      return byImpact !== 0 ? byImpact : a.i - b.i;
    })
    .map((x) => x.gap);
}
