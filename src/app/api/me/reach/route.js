import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { reachGaps } from "@/lib/artisan-reach";

// Per-user data behind a session — never prerendered or cached.
export const dynamic = "force-dynamic";

/**
 * What the signed-in artisan can do to be found, and where they already appear.
 *
 * Feeds the "I want customers to find me" door on /post-job, which exists
 * because six artisans posted adverts into the customer job board while already
 * having listings — see lib/artisan-reach.js for the full reasoning.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // A customer has no reach to report — this is not their panel.
  if (user.role !== "ARTISAN") {
    return NextResponse.json({ error: "Artisan accounts only." }, { status: 403 });
  }

  const [profile, services] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        bio: true,
        avatarUrl: true,
        galleryUrls: true,
        phone: true,
        ratingAverage: true,
        completedDealCount: true,
      },
    }),
    prisma.service.findMany({
      where: { artisanId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        city: true,
        priceMin: true,
        priceMax: true,
        description: true,
        category: { select: { slug: true, name: true } },
      },
    }),
  ]);

  if (!profile) return NextResponse.json({ error: "Profile not found." }, { status: 404 });

  const { pages, gaps } = reachGaps({ profile, services });

  return NextResponse.json({
    pages,
    gaps,
    listings: services.length,
    // Real, countable facts only — the panel states these, it does not estimate
    // traffic or promise ranking.
    completedDeals: profile.completedDealCount ?? 0,
    rating: profile.ratingAverage,
  });
}
