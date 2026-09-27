import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { citySlug } from "@/lib/constants";
import { allGuides } from "@/lib/guides";
import { parseEditorialDate, newest, lastMod } from "@/lib/sitemap-dates";

const BASE = SITE_URL;

// Generated on request rather than at build time, so a sleeping Neon database can
// never fail a deploy — but cached for an hour afterwards. Crawlers hit this far
// more often than the data changes, and it was previously running its queries on
// every single request.
export const revalidate = 3600;

// ── lastmod policy ─────────────────────────────────────────────────────────
//
// Before this, 8 of 174 URLs carried a <lastmod> (only the open jobs did), so
// crawlers had nothing to prioritise on. The fix is NOT to stamp new Date() on
// everything: a sitemap claiming all 174 pages changed this morning is worse than
// no lastmod at all, because it is a lie a crawler will learn to discount.
//
// So each URL gets a lastmod only where a real timestamp exists:
//
//   /artisans/<id>            User.updatedAt
//   /jobs/<id>                JobRequest.updatedAt
//   /services/<cat>/<city>    MAX(Service.updatedAt) for that category+city
//   /services/<cat>           MAX(Service.updatedAt) across that category
//   /guides/<slug>            the guide's own editorial `updated` month
//   everything else           NO lastmod — hand-written pages have no timestamp
//                             source, and omitting the field is the honest answer
//
// Month-precision guide dates are published as the first of that month. That is
// the actual precision of the source, not a guess.

export default async function sitemap() {
  // Hand-written pages: no lastModified key at all. Next omits the element when
  // the property is absent, which is exactly what we want.
  const staticRoutes = [
    "", "/browse", "/jobs", "/services", "/guides", "/pricing", "/join",
    "/about", "/contact", "/help", "/terms", "/privacy", "/register",
  ].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const guideRoutes = allGuides().map((g) => {
    const when = parseEditorialDate(g.updated);
    return {
      url: `${BASE}/guides/${g.slug}`,
      ...lastMod(when),
      changeFrequency: "monthly",
      priority: 0.7,
    };
  });

  let dynamicRoutes = [];
  try {
    // Four queries, the same number as before. The category+city grouping does in
    // one round trip what would otherwise be a MAX() per landing page — there are
    // 87 of those, so this is the difference between 4 queries and 90.
    const [artisans, jobs, categories, serviceGroups] = await Promise.all([
      prisma.user.findMany({
        where: { role: "ARTISAN" },
        select: { id: true, updatedAt: true },
      }),
      prisma.jobRequest.findMany({
        where: { status: "OPEN" },
        select: { id: true, updatedAt: true },
      }),
      prisma.category.findMany({ select: { id: true, slug: true } }),
      prisma.service.groupBy({
        by: ["categoryId", "city"],
        _max: { updatedAt: true },
      }),
    ]);

    const slugById = new Map(categories.map((c) => [c.id, c.slug]));

    // Roll the category+city maxima up into a per-category maximum.
    const perCategory = new Map();
    for (const g of serviceGroups) {
      perCategory.set(g.categoryId, newest(perCategory.get(g.categoryId), g._max.updatedAt));
    }

    const categoryRoutes = categories.map((c) => {
      const when = perCategory.get(c.id) || null;
      return {
        url: `${BASE}/services/${c.slug}`,
        ...lastMod(when),
        changeFrequency: "weekly",
        priority: 0.8,
      };
    });

    const localRoutes = serviceGroups
      .filter((g) => slugById.has(g.categoryId) && g.city)
      .map((g) => ({
        url: `${BASE}/services/${slugById.get(g.categoryId)}/${citySlug(g.city)}`,
        ...lastMod(g._max.updatedAt),
        changeFrequency: "weekly",
        priority: 0.7,
      }));

    dynamicRoutes = [
      ...categoryRoutes,
      ...localRoutes,
      ...artisans.map((a) => ({
        url: `${BASE}/artisans/${a.id}`,
        ...lastMod(a.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      })),
      ...jobs.map((j) => ({
        url: `${BASE}/jobs/${j.id}`,
        ...lastMod(j.updatedAt),
        changeFrequency: "daily",
        priority: 0.5,
      })),
    ];
  } catch (e) {
    // If the DB is unreachable, still return the static + guide routes rather
    // than serving a 500 to a crawler.
    console.error("[sitemap] database unreachable, serving static routes only:", e);
  }

  return [...staticRoutes, ...guideRoutes, ...dynamicRoutes];
}
