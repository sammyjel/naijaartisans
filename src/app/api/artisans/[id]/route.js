import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public artisan profile: basic info, their services, and reviews.
export async function GET(_request, { params }) {
  const artisan = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      id: true, name: true, city: true, bio: true, role: true, phone: true, email: true, createdAt: true,
      services: { include: { category: true }, orderBy: { createdAt: "desc" } },
      reviewsGot: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!artisan || artisan.role !== "ARTISAN")
    return NextResponse.json({ error: "Artisan not found." }, { status: 404 });

  const ratings = artisan.reviewsGot.map((r) => r.rating);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

  return NextResponse.json({
    artisan: { ...artisan, avgRating, reviewCount: ratings.length },
  });
}
