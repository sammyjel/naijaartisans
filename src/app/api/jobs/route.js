import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/jobs?category=plumbing&city=Lagos&mine=1
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const categorySlug = searchParams.get("category");
  const city = searchParams.get("city");
  const mine = searchParams.get("mine");

  const where = {};
  if (categorySlug) where.category = { slug: categorySlug };
  if (city) where.city = city;

  if (mine) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    where.customerId = user.id;
  }

  const jobs = await prisma.jobRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      customer: { select: { id: true, name: true, city: true } },
      _count: { select: { quotes: true } },
    },
  });

  return NextResponse.json({ jobs });
}

// POST /api/jobs  (customers post a job request)
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json();
  const title = (body.title || "").trim();
  const description = (body.description || "").trim();
  const city = (body.city || "").trim() || user.city;
  const categoryId = body.categoryId;
  const budget = body.budget ? parseInt(body.budget, 10) : null;

  if (!title || !description || !categoryId || !city)
    return NextResponse.json({ error: "Title, description, category and city are required." }, { status: 400 });

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Invalid category." }, { status: 400 });

  const job = await prisma.jobRequest.create({
    data: { title, description, city, categoryId, budget, customerId: user.id },
    include: { category: true },
  });

  return NextResponse.json({ job }, { status: 201 });
}
