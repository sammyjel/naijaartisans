// Approve (or un-approve) an artisan-posted job as a real vacancy.
//
//   POST /api/admin/jobs/<id>/vacancy   { approved: true | false }
//
// Admin-only. Approval only lifts the poster-role check in lib/job-seo.js — a
// filled job stays noindexed whatever this says. The job page is force-dynamic
// and the sitemap is rebuilt on its own schedule, so nothing needs revalidating.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  if (!isAdmin()) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.approved !== "boolean") {
    return NextResponse.json({ error: "Send { approved: true } or { approved: false }." }, { status: 400 });
  }

  try {
    const job = await prisma.jobRequest.update({
      where: { id: params.id },
      data: { vacancyApprovedAt: body.approved ? new Date() : null },
      select: { id: true, vacancyApprovedAt: true },
    });
    return NextResponse.json({ job });
  } catch (err) {
    if (err?.code === "P2025") return NextResponse.json({ error: "Job not found." }, { status: 404 });
    console.error("[vacancy] update failed:", err);
    return NextResponse.json({ error: "Could not update the job." }, { status: 500 });
  }
}
