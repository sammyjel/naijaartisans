import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/services?category=plumbing&city=Lagos&q=pipe
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const city = searchParams.get("city");
  const q = searchParams.get("q");

  const where = {};
  if (categorySlug) where.category = { slug: categorySlug };
  if (city) where.city = city;
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { description: { contains: q } },
    ];
  }

  const services = await prisma.service.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      artisan: { select: { id: true, name: true, city: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ services });
}

// POST /api/services  (artisans only) - create a service listing
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  if (user.role !== "ARTISAN")
    return NextResponse.json({ error: "Only artisans can list services." }, { status: 403 });

  const body = await request.json();
  const title = (body.title || "").trim();
  const description = (body.description || "").trim();
  const city = (body.city || "").trim() || user.city;
  const categoryId = body.categoryId;
  const priceMin = body.priceMin ? parseInt(body.priceMin, 10) : null;
  const priceMax = body.priceMax ? parseInt(body.priceMax, 10) : null;

  if (!title || !description || !categoryId || !city)
    return NextResponse.json({ error: "Title, description, category and city are required." }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  const service = await prisma.service.create({
    data: { title, description, city, categoryId, priceMin, priceMax, artisanId: user.id },
    include: { category: true },
  });

  return NextResponse.json({ service }, { status: 201 });
}
