import { prisma } from "@/lib/prisma";

const BASE = "https://naijaartisans.vercel.app";

// Generated on-demand so the build never depends on the database being awake.
export const dynamic = "force-dynamic";

export default async function sitemap() {
  const staticRoutes = ["", "/browse", "/jobs", "/about", "/register"].map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  let dynamicRoutes = [];
  try {
    const [artisans, jobs] = await Promise.all([
      prisma.user.findMany({ where: { role: "ARTISAN" }, select: { id: true } }),
      prisma.jobRequest.findMany({ where: { status: "OPEN" }, select: { id: true, createdAt: true } }),
    ]);

    dynamicRoutes = [
      ...artisans.map((a) => ({ url: `${BASE}/artisans/${a.id}`, changeFrequency: "weekly", priority: 0.6 })),
      ...jobs.map((j) => ({ url: `${BASE}/jobs/${j.id}`, lastModified: j.createdAt, changeFrequency: "daily", priority: 0.5 })),
    ];
  } catch {
    // If the DB is unreachable, still return the static routes.
  }

  return [...staticRoutes, ...dynamicRoutes];
}
