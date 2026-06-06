import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/reviews - leave a review for an artisan
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  const body = await request.json();
  const targetId = body.targetId;
  const rating = parseInt(body.rating, 10);
  const comment = (body.comment || "").trim() || null;

  if (!targetId) return NextResponse.json({ error: "Missing artisan." }, { status: 400 });
  if (!(rating >= 1 && rating <= 5))
    return NextResponse.json({ error: "Rating must be 1-5." }, { status: 400 });
  if (targetId === user.id)
    return NextResponse.json({ error: "You cannot review yourself." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "ARTISAN")
    return NextResponse.json({ error: "Artisan not found." }, { status: 404 });

  const review = await prisma.review.create({
    data: { rating, comment, authorId: user.id, targetId },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ review }, { status: 201 });
}
