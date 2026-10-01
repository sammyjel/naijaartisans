import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkReviewEligibility, createReview } from "@/lib/reviews";
import { revalidateFor } from "@/lib/cached-queries";

// GET /api/reviews?targetId=... - may the current user review this artisan?
//
// Exists so the review form can show "you can review after an artisan quotes on
// your job" up front, instead of letting someone write a review and only then
// telling them it is not allowed.
export async function GET(request) {
  const user = await getCurrentUser();
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("targetId");

  if (!targetId) return NextResponse.json({ error: "Missing targetId." }, { status: 400 });
  if (!user) return NextResponse.json({ canReview: false, reason: "Log in to leave a review." });

  const verdict = await checkReviewEligibility({ authorId: user.id, targetId });
  if (verdict.ok) {
    return NextResponse.json({
      canReview: true,
      // True when a completed deal backs this review, which is what earns the
      // "Verified job" badge. The form tells the customer so before they write.
      verified: verdict.verified,
      job: verdict.job ? { id: verdict.job.id, title: verdict.job.title } : null,
      deal: verdict.deal ? { id: verdict.deal.id, title: verdict.deal.title } : null,
    });
  }
  return NextResponse.json({ canReview: false, reason: verdict.reason });
}

// POST /api/reviews - leave a review for an artisan.
//
// Reviews are earned rather than open to anyone with an account. Two tiers: a
// COMPLETED deal (the artisan finished and the customer confirmed) is recorded
// as verified; having merely been quoted still qualifies but is not. See
// src/lib/reviews.js for why both are accepted.
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

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "ARTISAN")
    return NextResponse.json({ error: "Artisan not found." }, { status: 404 });

  const verdict = await checkReviewEligibility({ authorId: user.id, targetId });
  if (!verdict.ok)
    return NextResponse.json({ error: verdict.reason }, { status: verdict.status });

  try {
    const review = await createReview({
      authorId: user.id,
      targetId,
      rating,
      comment,
      jobRequestId: verdict.job ? verdict.job.id : null,
      // Set only when a confirmed deal backs it. This is what the profile reads
      // to render "Verified job", so it must never be filled in speculatively.
      dealId: verdict.deal ? verdict.deal.id : null,
    });
    revalidateFor("review", [`/artisans/${targetId}`, "/browse"]);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    // The unique index is the real duplicate guard; checkReviewEligibility above
    // only makes the common case a friendlier message. This catches the race
    // where two submissions arrive at once.
    if (err && err.code === "P2002")
      return NextResponse.json(
        { error: "You have already reviewed this artisan." },
        { status: 409 }
      );
    console.error("[reviews] create failed:", err);
    return NextResponse.json({ error: "Could not save your review." }, { status: 500 });
  }
}
