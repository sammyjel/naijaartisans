import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/seo";
import { citySlug } from "@/lib/constants";

const BASE = SITE_URL;

// Generated on-demand so the build never depends on the database being awake.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const staticRoutes = ["", "/browse", "/jobs", "/services", "/pricing", "/about", "/register"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  let dynamicRoutes = [];
  try {
    const [artisans, jobs, categories, services] = await Promise.all([
      prisma.user.findMany({ where: { role: "ARTISAN" }, select: { id: true } }),
      prisma.jobRequest.findMany({ where: { status: "OPEN" }, select: { id: true, createdAt: true } }),
      prisma.category.findMany({ select: { slug: true } }),
      prisma.service.findMany({ select: { city: true, category: { select: { slug: true } } } }),
    ]);

    // One landing page per category, plus per category+city that actually has a listing.
    const categoryRoutes = categories.map((c) => ({
      url: `${BASE}/services/${c.slug}`,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const pairs = new Set(services.map((s) => `${s.category.slug}|${s.city}`));
    const localRoutes = [...pairs].map((pair) => {
      const [slug, city] = pair.split("|");
      return {
        url: `${BASE}/services/${slug}/${citySlug(city)}`,
        changeFrequency: "weekly",
        priority: 0.7,
      };
    });

    dynamicRoutes = [
      ...categoryRoutes,
      ...localRoutes,
      ...artisans.map((a) => ({ url: `${BASE}/artisans/${a.id}`, changeFrequency: "weekly", priority: 0.6 })),
      ...jobs.map((j) => ({ url: `${BASE}/jobs/${j.id}`, lastModified: j.createdAt, changeFrequency: "daily", priority: 0.5 })),
    ];
  } catch {
    // If the DB is unreachable, still return the static routes.
  }

  return [...staticRoutes, ...dynamicRoutes];
}
