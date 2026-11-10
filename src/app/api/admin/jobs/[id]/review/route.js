// Release or reject a HELD post (see lib/job-screen.js).
//
//   POST /api/admin/jobs/<id>/review   { decision: "approve" | "reject" }
//
// approve  → OPEN, on the board, and artisans are alerted exactly as if a
//            customer had just posted it (so the owner gets JOB POSTED then).
// reject   → CLOSED. Stays private; nobody is emailed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { notifyArtisansOfJob } from "@/lib/notifications";
import { revalidateFor } from "@/lib/cached-queries";
import { HELD } from "@/lib/job-screen";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // approving alerts artisans, which is awaited

export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const { decision } = await request.json().catch(() => ({}));
  if (decision !== "approve" && decision !== "reject")
    return NextResponse.json({ error: 'Send { decision: "approve" } or { decision: "reject" }.' }, { status: 400 });

  const job = await prisma.jobRequest.findUnique({ where: { id: params.id }, include: { customer: { select: { role: true } } } });
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  if (job.status !== HELD) return NextResponse.json({ error: "This post has already been reviewed." }, { status: 409 });

  if (decision === "reject") {
    await prisma.jobRequest.update({ where: { id: job.id }, data: { status: "CLOSED" } });
    return NextResponse.json({ ok: true, status: "CLOSED" });
  }

  // Approving is the owner saying "this is a real job", which is also what the
  // vacancy flag means for an artisan-posted job (lib/job-seo.js).
  const opened = await prisma.jobRequest.update({
    where: { id: job.id },
    data: { status: "OPEN", ...(job.customer?.role === "ARTISAN" ? { vacancyApprovedAt: new Date() } : {}) },
    include: { category: true },
  });
  revalidateFor("job", ["/jobs", "/sitemap.xml"]);
  const delivery = await notifyArtisansOfJob(opened);
  return NextResponse.json({ ok: true, status: "OPEN", notified: delivery });
}
