import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// POST /api/jobs/[id]/quotes - an artisan sends a quote on a job request
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  if (user.role !== "ARTISAN")
    return NextResponse.json({ error: "Only artisans can send quotes." }, { status: 403 });

  const job = await prisma.jobRequest.findUnique({ where: { id: params.id } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.status !== "OPEN")
    return NextResponse.json({ error: "This job is closed." }, { status: 400 });
  if (job.customerId === user.id)
    return NextResponse.json({ error: "You cannot quote your own job." }, { status: 400 });

  const body = await request.json();
  const message = (body.message || "").trim();
  const price = body.price ? parseInt(body.price, 10) : null;
  if (!message) return NextResponse.json({ error: "Write a short message." }, { status: 400 });

  try {
    const quote = await prisma.quote.create({
      data: { message, price, jobRequestId: job.id, artisanId: user.id },
      include: { artisan: { select: { id: true, name: true, city: true } } },
    });
    return NextResponse.json({ quote }, { status: 201 });
  } catch (err) {
    // unique constraint -> already quoted
    if (err.code === "P2002")
      return NextResponse.json({ error: "You already sent a quote for this job." }, { status: 409 });
    throw err;
  }
}
